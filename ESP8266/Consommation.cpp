#include "Consommation.h"
#include <time.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>

Consommation::Consommation(int pinAnalogique, const String& url, const String& token, int radiateurId)
  : pinA0(pinAnalogique), serverUrl(url), authToken(token), radId(radiateurId) {
  energieWh = 0.0;
  dernierTemps = 0;
  derniereHeure = -1;
  pinMode(pinA0, INPUT);
}

void Consommation::setRadiateurId(int id) {
  radId = id;
}

void Consommation::setToken(const String& token) {
  authToken = token;
}

void Consommation::setUrl(const String& url) {
  serverUrl = url;
}

void Consommation::initTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("⏳ Synchronisation NTP");
  while (time(nullptr) < 100000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n🕒 Heure synchronisée.");
  dernierTemps = millis();
}

void Consommation::mesurerEtCalculer() {
  int valMax = 0;
  for (int i = 0; i < 20; i++) {
    int analogValue = analogRead(pinA0);
    if (analogValue > valMax) valMax = analogValue;
    delay(1);
  }

  float voltage = valMax * (3.3 / 1023.0);
  float imax = voltage * 6;
  float ieff = imax / 1.41421356;
  float p = ieff * 230;

  if (p < 300.0) {
    p = 0.0;
  }

  Serial.print("Puissance: ");
  Serial.print(p);
  Serial.println(" W");

  unsigned long maintenant = millis();
  float dureeHeures = (maintenant - dernierTemps) / 3600000.0;
  dernierTemps = maintenant;

  energieWh += p * dureeHeures;

  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  int heureActuelle = timeinfo->tm_hour;
  int minute = timeinfo->tm_min;

  // test 10 secondes
  //envoyerBDD(energieWh / 1000.0);
  //energieWh = 0.0;
  // test 10 secondes

  if (minute == 0 && heureActuelle != derniereHeure) {
  envoyerBDD(energieWh / 1000.0);
  energieWh = 0.0;
  derniereHeure = heureActuelle;
 }
}

void Consommation::envoyerBDD(float kwh) {
  if (WiFi.status() == WL_CONNECTED && radId != -1) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("Authorization", "Bearer " + authToken);

    String postData = "radiateur_id=" + String(radId) + "&consommation_kwh=" + String(kwh, 4);
    Serial.println("📤 POST: " + postData);

    int httpCode = http.POST(postData);
    String response = http.getString();

    if (httpCode > 0) {
      Serial.println("✅ HTTP " + String(httpCode));
      Serial.println("📩 Réponse serveur: " + response);
    } else {
      Serial.println("❌ Erreur HTTP : " + String(httpCode));
    }

    http.end();
  } else {
    Serial.println("⚠️ WiFi non connecté ou radiateur_id invalide");
  }
}
