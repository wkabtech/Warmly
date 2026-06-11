#ifndef TEMPERATURE_H
#define TEMPERATURE_H

#include <Arduino.h>
#include <DHT.h>

class Temperature {
public:
  Temperature(int pinDHT, const String& url, const String& token, int radiateurId);
  void begin();
  void envoyerTemperature();
  void setRadiateurId(int id);
  void setToken(const String& token);
  void setUrl(const String& url);

private:
  int dhtPin;
  DHT dht;
  String serverUrl;
  String authToken;
  int radId;

  void envoyerBDD(float temperature, float humidite);
};

#endif
