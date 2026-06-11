#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>
#include "OTA.h"
#include "ConfigManager.h"


WiFiClient* otaWifiClient = nullptr;
String localVersion = "";
String firmwareCheckURL = "";
unsigned long lastOTACheck = 0;
const unsigned long otaInterval = 86400000; // 24h

extern ConfigManager configManager;
extern const char* serverAddress;  // 🔄 Utilisation de la variable globale

void envoyerStatutFirmware(const String& status) {
  if (WiFi.status() != WL_CONNECTED || otaWifiClient == nullptr) return;

  HTTPClient http;
  String url = String(serverAddress) + "/warmly_api/espversion.php";  // ✅ URL générée dynamiquement
  http.begin(*otaWifiClient, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["chip_id"] = String(ESP.getChipId());
  doc["update_status"] = status;
  doc["timestamp"] = time(nullptr);
  doc["firmware_version"] = localVersion;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("📡 Statut firmware POST (%s) envoyé [%d]\n", status.c_str(), httpCode);
  } else {
    Serial.printf("⚠️ Erreur envoi statut firmware : %d\n", httpCode);
  }

  http.end();
}

void setupOTA(const String& currentVersion, const String& firmwareBaseURL, WiFiClient& client) {
  localVersion = currentVersion;
  firmwareCheckURL = firmwareBaseURL;
  otaWifiClient = &client;

  Serial.println("📦 Initialisation OTA...");
  lastOTACheck = millis();
  checkForOTA();
}

void checkForOTA() {
  if (WiFi.status() != WL_CONNECTED || firmwareCheckURL == "" || otaWifiClient == nullptr) return;

  Serial.println("🔍 Vérification manuelle de mise à jour OTA...");
  envoyerStatutFirmware("checking");

  HTTPClient http;
  http.begin(*otaWifiClient, firmwareCheckURL + "/version.txt");
  int httpCode = http.GET();

  if (httpCode == 200) {
    String newVersion = http.getString();
    newVersion.trim();

    Serial.printf("🔢 Version distante : %s\n", newVersion.c_str());
    Serial.printf("🔢 Version locale   : %s\n", localVersion.c_str());

    if (newVersion != localVersion) {
      envoyerStatutFirmware("update_available");
      Serial.println("🔁 Nouvelle version disponible, enregistrement avant MAJ...");

      configManager.setFirmwareVersion(newVersion);
      localVersion = newVersion;

      Serial.println("📦 Enregistrement version OK, lancement de la MAJ OTA...");
      envoyerStatutFirmware("updating");

      t_httpUpdate_return ret = ESPhttpUpdate.update(*otaWifiClient, firmwareCheckURL + "/firmware.bin");

      switch (ret) {
        case HTTP_UPDATE_FAILED:
          Serial.printf("❌ MAJ échouée : %s\n", ESPhttpUpdate.getLastErrorString().c_str());
          envoyerStatutFirmware("update_failed");
          break;
        case HTTP_UPDATE_NO_UPDATES:
          Serial.println("ℹ️ Aucun firmware disponible.");
          envoyerStatutFirmware("no_update");
          break;
        case HTTP_UPDATE_OK:
          Serial.println("✅ MAJ réussie ! L'ESP redémarre...");
          envoyerStatutFirmware("update_success");
          break;
      }
    } else {
      Serial.println("🟢 Firmware déjà à jour.");
      envoyerStatutFirmware("up_to_date");
    }
  } else {
    Serial.printf("⚠️ Erreur HTTP (%d) lors de version.txt\n", httpCode);
    envoyerStatutFirmware("check_failed");
  }

  http.end();
}

void checkOTAIntervalle() {
  unsigned long now = millis();
  if ((now - lastOTACheck >= otaInterval) && WiFi.status() == WL_CONNECTED) {
    Serial.println("⏱️ Vérification programmée de mise à jour OTA...");
    checkForOTA();
    lastOTACheck = now;
  }
}

void handleOTAMQTT(String topic, String payload) {
  if (payload.indexOf("\"ota\":true") >= 0) {
    Serial.println("📡 Déclenchement OTA via MQTT...");
    checkForOTA();
  }
}
