#include "ConfigManager.h"
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>

ConfigManager::ConfigManager() : server(80), configValid(false) {
  memset(&creds, 0, sizeof(creds));
}

void ConfigManager::begin() {
  EEPROM.begin(sizeof(WifiCredentials));
  EEPROM.get(0, creds);

  Serial.println("📖 Lecture EEPROM...");
  Serial.print("➤ SSID: ");
  Serial.println(creds.ssid);
  Serial.print("➤ MDP: ");
  Serial.println(creds.password);
  Serial.print("➤ radiateur_id: ");
  Serial.println(creds.radiateur_id);
  Serial.print("➤ piece_id: ");
  Serial.println(creds.piece_id);
  Serial.print("➤ utilisateur_id: ");
  Serial.println(creds.utilisateur_id);
  Serial.print("➤ token: ");
  Serial.println(creds.token);

  configValid = strlen(creds.ssid) > 0 && strlen(creds.password) > 0;
}

bool ConfigManager::isConfigValid() { return configValid; }

const char* ConfigManager::getSSID() { return creds.ssid; }
const char* ConfigManager::getPassword() { return creds.password; }
int ConfigManager::getRadiateurId() { return creds.radiateur_id; }
int ConfigManager::getPieceId() { return creds.piece_id; }
int ConfigManager::getUtilisateurId() { return creds.utilisateur_id; }
const char* ConfigManager::getToken() { return creds.token; }

// On retourne une valeur vide car on n'utilise plus l'EEPROM pour ça
const char* ConfigManager::getFirmwareVersion() {
  return "";  // Pas utilisé
}

// Ne fait rien volontairement
void ConfigManager::setFirmwareVersion(const String& version) {
  // Ignoré volontairement pour ne pas modifier l'EEPROM
}

void ConfigManager::setRadiateurInfo(int utilisateurId, int pieceId, int radiateurId, const char* token) {
  creds.utilisateur_id = utilisateurId;
  creds.piece_id = pieceId;
  creds.radiateur_id = radiateurId;
  strncpy(creds.token, token, sizeof(creds.token));
  creds.token[sizeof(creds.token) - 1] = '\0';

  EEPROM.put(0, creds);
  EEPROM.commit();

  Serial.println("💾 Infos radiateur sauvegardées !");
}

void ConfigManager::resetConfig() {
  Serial.println("🧹 Effacement complet de l'EEPROM...");
  memset(&creds, 0, sizeof(creds));
  EEPROM.put(0, creds);
  EEPROM.commit();
  configValid = false;
  Serial.println("✅ EEPROM complètement réinitialisée.");
}

void ConfigManager::startConfigPortal(const char* apSsid, const char* apPassword) {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSsid, apPassword);
  delay(500);

  IPAddress apIP = WiFi.softAPIP();
  dns.start(53, "*", apIP);

  Serial.print("🛰️ Point d'accès lancé : ");
  Serial.println(apIP);

  server.on("/status", HTTP_GET, [this]() {
    String status = "{\"connected\": ";
    status += (WiFi.status() == WL_CONNECTED) ? "true" : "false";
    status += "}";

    server.send(200, "application/json", status);
  });

  server.on("/scan", HTTP_GET, [this]() {
    Serial.println("🔍 Scan Wi-Fi demandé depuis /scan");
    int n = WiFi.scanNetworks();
    Serial.printf("🔢 %d réseaux trouvés\n", n);

    DynamicJsonDocument doc(1024);
    JsonArray array = doc.to<JsonArray>();

    for (int i = 0; i < n; i++) {
      array.add(WiFi.SSID(i));
    }

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  server.on("/config", HTTP_POST, [this]() {
    String body = server.arg("plain");
    Serial.println("📥 Reçu /config : " + body);

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err) {
      Serial.println("❌ JSON invalide");
      server.send(400, "application/json", "{\"error\":\"JSON invalide\"}");
      return;
    }

    const char* ssid = doc["ssid"];
    const char* password = doc["password"];

    if (!ssid || !password || strlen(ssid) == 0) {
      Serial.println("❌ Champs manquants");
      server.send(400, "application/json", "{\"error\":\"Champs manquants\"}");
      return;
    }

    strncpy(creds.ssid, ssid, sizeof(creds.ssid));
    strncpy(creds.password, password, sizeof(creds.password));
    creds.ssid[sizeof(creds.ssid) - 1] = '\0';
    creds.password[sizeof(creds.password) - 1] = '\0';

    EEPROM.put(0, creds);
    EEPROM.commit();

    Serial.println("✅ Wi-Fi config sauvegardée !");
    server.send(200, "application/json", "{\"success\":true}");
    delay(1000);
    ESP.restart();
  });

server.on("/abort", HTTP_ANY, [this]() {
  Serial.println("🛑 [ESP] Reçu /abort");
  Serial.printf("Méthode HTTP: %d\n", server.method());
  server.send(200, "application/json", "{\"success\":true}");
  delay(1000);
  ESP.restart();
});

  server.onNotFound([this]() { handlePortal(); });
  server.begin();
  Serial.println("🌐 Serveur HTTP lancé (mode portail captif)");
}


void ConfigManager::handlePortal() {
  if (server.method() == HTTP_POST) {
    strncpy(creds.ssid, server.arg("ssid").c_str(), sizeof(creds.ssid));
    strncpy(creds.password, server.arg("password").c_str(), sizeof(creds.password));
    creds.ssid[sizeof(creds.ssid) - 1] = '\0';
    creds.password[sizeof(creds.password) - 1] = '\0';
    EEPROM.put(0, creds);
    EEPROM.commit();
    server.send(200, "text/html", "<h2>✅ Configuration enregistrée. Redémarrage...</h2>");
    delay(1000);
    ESP.restart();
  } else {
    server.send(200, "text/html",
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Configuration WiFi</title></head><body>"
      "<h2>Configurer le WiFi</h2>"
      "<form method='POST'>"
      "SSID: <input name='ssid'><br/>"
      "Mot de passe: <input name='password' type='password'><br/>"
      "<input type='submit' value='Enregistrer'/>"
      "</form></body></html>"
    );
  }
}

void ConfigManager::handleClient() {
  dns.processNextRequest();
  server.handleClient();
}

void ConfigManager::supprimerRadiateurServeur(const char* serverAddress, WiFiClient& client) {
  if (creds.radiateur_id <= 0) {
    Serial.println("⚠️ Aucun radiateur enregistré, pas de suppression.");
    return;
  }

  HTTPClient http;
  String url = String(serverAddress) + "/warmly_api/radiateurs.php?action=supprimer";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String body = "radiateur_id=" + String(creds.radiateur_id);
  Serial.println("📤 Suppression du radiateur via : " + url);
  Serial.println("📦 Corps POST : " + body);

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("✅ Radiateur supprimé (HTTP %d)\n", code);
    Serial.println("📝 Réponse : " + http.getString());
  } else {
    Serial.printf("❌ Erreur HTTP (%d) lors de la suppression\n", code);
  }

  http.end();
}
