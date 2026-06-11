
#include "Temperature.h"
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>

// === Variables pour MQTT
extern PubSubClient mqttClient;
extern int utilisateur_id;
extern int piece_id;
extern int radiateur_id;

// === Variables de seuil (mémoire du dernier état)
String dernierSeuilTemp = "";
String dernierSeuilHum = "";

Temperature::Temperature(int pinDHT, const String& url, const String& token, int radiateurId)
  : dhtPin(pinDHT), dht(pinDHT, DHT11), serverUrl(url), authToken(token), radId(radiateurId) {}

void Temperature::begin() {
  dht.begin();
}

void Temperature::setRadiateurId(int id) {
  radId = id;
}

void Temperature::setToken(const String& token) {
  authToken = token;
}

void Temperature::setUrl(const String& url) {
  serverUrl = url;
}

void Temperature::envoyerTemperature() {
  if (WiFi.status() == WL_CONNECTED && radId != -1) {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    float f = dht.readTemperature(true);

    if (isnan(h) || isnan(t) || isnan(f)) {
      Serial.println("❌ Échec lecture DHT11");
      return;
    }

    Serial.print("🌡️ Température : ");
    Serial.print(t);
    Serial.println(" °C");

    Serial.print("💧 Humidité : ");
    Serial.print(h);
    Serial.println(" %");

    // === 1️⃣ Envoi en base de données via API REST
    envoyerBDD(t, h);

    // === 2️⃣ Envoi MQTT seulement si le seuil change
    // Déterminer le seuil actuel pour la température
    String seuilTemp = "";
    if (t >= 18 && t <= 21) {
      seuilTemp = "ideal";
    } else if ((t >= 16 && t < 18) || (t > 21 && t <= 24)) {
      seuilTemp = "acceptable";
    } else {
      seuilTemp = "inconfortable";
    }

    // Envoi MQTT si le seuil change
    if (seuilTemp != dernierSeuilTemp) {
      String topicTemp = "radiateur/" + String(utilisateur_id) + "/" + String(piece_id) + "/" + String(radiateur_id) + "/temperature";
      String payloadTemp = "{\"etat\":\"" + seuilTemp + "\", \"valeur\":\"" + String(t) + "\"}";
      mqttClient.publish(topicTemp.c_str(), payloadTemp.c_str());
      Serial.println("📡 Envoi MQTT changement seuil Température : " + payloadTemp);
      dernierSeuilTemp = seuilTemp;
    }

    // Déterminer le seuil actuel pour l'humidité
    String seuilHum = "";
    if (h >= 40 && h <= 60) {
      seuilHum = "ideal";
    } else if ((h >= 30 && h < 40) || (h > 60 && h <= 70)) {
      seuilHum = "acceptable";
    } else {
      seuilHum = "inconfortable";
    }

    // Envoi MQTT si le seuil change
    if (seuilHum != dernierSeuilHum) {
      String topicHum = "radiateur/" + String(utilisateur_id) + "/" + String(piece_id) + "/" + String(radiateur_id) + "/humidite";
      String payloadHum = "{\"etat\":\"" + seuilHum + "\", \"valeur\":\"" + String(h) + "\"}";
      mqttClient.publish(topicHum.c_str(), payloadHum.c_str());
      Serial.println("📡 Envoi MQTT changement seuil Humidité : " + payloadHum);
      dernierSeuilHum = seuilHum;
    }
  }
}

void Temperature::envoyerBDD(float temperature, float humidite) {
  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  http.addHeader("Authorization", authToken);

  String postData = "radiateur_id=" + String(radId) + "&temperature=" + String(temperature, 2) + "&humidite=" + String(humidite, 2);

  Serial.println("📤 Envoi données: " + postData);

  int httpCode = http.POST(postData);
  String response = http.getString();

  if (httpCode > 0) {
    Serial.println("✅ HTTP " + String(httpCode));
    Serial.println("📩 Réponse: " + response);
  } else {
    Serial.println("❌ Erreur HTTP: " + String(httpCode));
  }

  http.end();
}
