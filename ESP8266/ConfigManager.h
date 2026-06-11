#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <EEPROM.h>

struct WifiCredentials {
  char ssid[30];
  char password[30];
  int utilisateur_id;
  int piece_id;
  int radiateur_id;
  char token[200];
  // firmware_version est toujours présent pour compatibilité mais inutilisé
  char firmware_version[16];
};

class ConfigManager {
public:
  ConfigManager();

  void begin();
  bool isConfigValid();

  const char* getSSID();
  const char* getPassword();
  int getRadiateurId();
  int getPieceId();
  int getUtilisateurId();
  const char* getToken();

  // Conservé pour compatibilité, mais inutilisé
  const char* getFirmwareVersion();
  void setFirmwareVersion(const String& version);

  void setRadiateurInfo(int utilisateurId, int pieceId, int radiateurId, const char* token);

  void startConfigPortal(const char* apSsid = "Setup Portal", const char* apPassword = "mrdiy.ca");
  void handleClient();
  void supprimerRadiateurServeur(const char* serverAddress, WiFiClient& client);
  void resetConfig();

private:
  void handlePortal();

  ESP8266WebServer server;
  DNSServer dns;
  WifiCredentials creds;
  bool configValid;
};

#endif // CONFIG_MANAGER_H
