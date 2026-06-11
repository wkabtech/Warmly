#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include "ConfigManager.h"
#include "OTA.h"
#include "FilPilote.h"
#include "Consommation.h"
#include "Temperature.h"

// ==== VERSION FIRMWARE ====
const String firmwareVersion = "1.0.0";

// ==== OBJETS ====
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
FilPilote fp(16, 5);
Consommation consommation(A0, "", "", -1);
Temperature temperature(4, "", "", -1); // GPIO 4 = D2
ConfigManager configManager;

// ==== PARAMÈTRES ====
const char* serverAddress = "http://172.16.200.35";
const char* mqttServer = "172.16.200.35";
const char* apSsid = "Warmly_ESP";
const char* apPassword = "warmly1234";
const int boutonPin = 0;

// ==== VARIABLES ====
String token = "";
int utilisateur_id = -1;
int piece_id = -1;
int radiateur_id = -1;
unsigned long dernierConso = 0;
unsigned long dernierTemp = 0;
bool consommationReady = false;

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  String topicStr = String(topic);
  Serial.print("📩 MQTT reçu sur le topic [");
  Serial.print(topicStr);
  Serial.print("] : ");
  Serial.println(msg);

  if (topicStr.endsWith("/init")) {
    Serial.println("💬 Message MQTT complet reçu :");
    Serial.println(msg);
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, msg);

    if (!error && doc.containsKey("radiateur_id")) {
      int radId = doc["radiateur_id"];
      int pieceId = doc["piece_id"];
      int userId = doc["utilisateur_id"];
      const char* tok = doc["token"];

      Serial.println("🔐 Données de mise à jour reçues via MQTT :");
      Serial.printf("   ➤ radiateur_id : %d\n", radId);
      Serial.printf("   ➤ piece_id     : %d\n", pieceId);
      Serial.printf("   ➤ utilisateur  : %d\n", userId);
      Serial.printf("   ➤ token        : %s\n", tok);
      

      configManager.setRadiateurInfo(userId, pieceId, radId, tok);
      utilisateur_id = userId;
      piece_id = pieceId;
      radiateur_id = radId;
      token = String(tok);
      String consommationUrl = String(serverAddress) + "/warmly_api/consommations.php?action=ajouter";
      consommation.setRadiateurId(radiateur_id);
      consommation.setToken(token);
      consommation.setUrl(consommationUrl);
      String temperatureUrl = String(serverAddress) + "/warmly_api/temperatures.php?action=ajouter";
      temperature.setRadiateurId(radiateur_id);
      temperature.setToken(token);
      temperature.setUrl(temperatureUrl);
      temperature.begin();
      consommationReady = true;


      reconnectMQTT();  // 🔁 Se réabonne proprement au bon /#
    } else {
      Serial.println("⚠️ Erreur init : JSON invalide ou clé manquante");
    }

  } else if (topicStr.endsWith("/mode")) {
    fp.commandeOrdres(msg);
  } else if (topicStr.endsWith("/temperature")) {
    Serial.println("📨 Envoie notifications température");
  } else if (topicStr.endsWith("/humidite")) {
    Serial.println("📨 Envoie notifications humidité");
  } else {
    Serial.println("⚠️ Topic inconnu, ignoré.");
  }

  handleOTAMQTT(topic, msg);
}





void reconnectMQTT() {
  if (mqttClient.connected()) return;

  Serial.print("🔁 Connexion MQTT...");
  String clientId = "radiateur-" + String(ESP.getChipId());

  if (mqttClient.connect(clientId.c_str())) {
    Serial.println("✅ Connecté au broker avec ID : " + clientId);

    if (utilisateur_id > 0) {
      String baseTopic = "radiateur/" + String(utilisateur_id) + "/#";
      mqttClient.subscribe(baseTopic.c_str());
      Serial.println("📡 Abonné à : " + baseTopic);
    } else {
      String chipTopic = "radiateur/" + String(ESP.getChipId()) + "/init";
      mqttClient.subscribe(chipTopic.c_str());
      Serial.println("⚠️ IDs non valides, abonné à : " + chipTopic);
    }

    delay(100);
  } else {
    Serial.print("❌ Échec : ");
    Serial.println(mqttClient.state());
    delay(2000);
  }
}







void envoyerStatutConnexion() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(serverAddress) + "/warmly_api/espappairage.php";
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["chip_id"] = String(ESP.getChipId());
  doc["status"] = "connected";
  doc["timestamp"] = time(nullptr);

  String payload;
  serializeJson(doc, payload);

  Serial.println("📤 Envoi du statut Wi-Fi à : " + url);
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    Serial.printf("✅ POST envoyé (%d)\n", httpResponseCode);
    String response = http.getString();
    Serial.println("📝 Réponse : " + response);
  } else {
    Serial.printf("❌ Erreur POST (%d)\n", httpResponseCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n🚀 Démarrage de l'ESP8266...");
  pinMode(boutonPin, INPUT_PULLUP);

  Serial.println("🧠 Lecture config EEPROM...");
  configManager.begin();

  radiateur_id = configManager.getRadiateurId();
  piece_id = configManager.getPieceId();
  utilisateur_id = configManager.getUtilisateurId();
  token = String(configManager.getToken());

  Serial.println("🔁 Données EEPROM existantes :");
  Serial.printf("🆔 Radiateur ID : %d\n", radiateur_id);
  Serial.printf("🏠 Pièce ID     : %d\n", piece_id);
  Serial.printf("👤 Utilisateur  : %d\n", utilisateur_id);
  Serial.printf("🔑 Token        : %s\n", token.c_str());
  Serial.printf("📦 Version FW   : %s\n", firmwareVersion.c_str());
  Serial.printf("🔑 Chip ID       : %lu\n", ESP.getChipId());

  if (configManager.isConfigValid()) {
    String consommationUrl = String(serverAddress) + "/warmly_api/consommations.php?action=ajouter";
    consommation.setRadiateurId(radiateur_id);
    consommation.setToken(token);
    consommation.setUrl(consommationUrl);
    consommationReady = true;
    Serial.println("✅ Données EEPROM valides → consommation activée");
    String temperatureUrl = String(serverAddress) + "/warmly_api/temperatures.php?action=ajouter";
    temperature.setRadiateurId(radiateur_id);
    temperature.setToken(token);
    temperature.setUrl(temperatureUrl);
    Serial.println("✅ Température activée");
    WiFi.mode(WIFI_STA);
    const char* ssid = configManager.getSSID();
    const char* password = configManager.getPassword();

    Serial.print("📖 SSID lu : ");
    Serial.println(ssid);
    Serial.print("📖 MDP lu : ");
    Serial.println(password);
    Serial.print("📶 Connexion à : ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);
  }

  mqttClient.setServer(mqttServer, 1883);
  mqttClient.setCallback(callback);

  Serial.println("🛠️ Initialisation du système OTA...");
  setupOTA(firmwareVersion, String(serverAddress) + "/firmwares", wifiClient);

  dernierConso = millis();
  dernierTemp = millis();
}

void loop() {
  static unsigned long boutonAppuiStart = 0;
  static bool boutonPrecedentEtatBas = false;
  static bool dejaConnecte = false;

  if (digitalRead(boutonPin) == LOW) {
    if (!boutonPrecedentEtatBas) {
      boutonAppuiStart = millis();
      boutonPrecedentEtatBas = true;
    } else if (millis() - boutonAppuiStart >= 3000) {
      Serial.println("🛠️ Appui long détecté → mode appairage !");
      configManager.supprimerRadiateurServeur(serverAddress, wifiClient);
      delay(1000);
      configManager.resetConfig();
      Serial.println("🔄 Configuration réinitialisée !");
      configManager.startConfigPortal(apSsid, apPassword);
      while (!configManager.isConfigValid()) {
        configManager.handleClient();
        delay(10);
      }
      Serial.println("📥 Config reçue → redémarrage...");
      delay(1000);
      ESP.restart();
    }
  } else {
    boutonPrecedentEtatBas = false;
  }

  configManager.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long dernierEssai = 0;
    unsigned long maintenant = millis();
    if (maintenant - dernierEssai > 5000) {
      Serial.println("🔁 WiFi non connecté, nouvelle tentative...");
      WiFi.reconnect();
      dernierEssai = maintenant;
    }
    return;
  } else if (!dejaConnecte) {
    dejaConnecte = true;
    Serial.print("📡 Connecté au Wi-Fi ! IP : ");
    Serial.println(WiFi.localIP());

    envoyerStatutConnexion();
    checkForOTA();
  }

  reconnectMQTT();
  mqttClient.loop();

  unsigned long maintenant = millis();
  if (consommationReady && maintenant - dernierConso >= 10000) {
    consommation.mesurerEtCalculer();
    dernierConso = maintenant;
  }
  if (maintenant - dernierTemp >= 10000) {
    temperature.envoyerTemperature();
    dernierTemp = maintenant;
  }

  checkOTAIntervalle();
}
