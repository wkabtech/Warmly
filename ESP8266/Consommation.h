#ifndef CONSOMMATION_H
#define CONSOMMATION_H

#include <Arduino.h>
#include <ESP8266HTTPClient.h>

class Consommation {
public:
  Consommation(int pinAnalogique, const String& url, const String& token, int radiateurId);
  void initTime();
  void mesurerEtCalculer();
  void setRadiateurId(int id);
  void setToken(const String& token);
  void setUrl(const String& url);

private:
  int pinA0;
  float energieWh;
  unsigned long dernierTemps;
  int derniereHeure;
  String serverUrl;
  String authToken;
  int radId;

  void envoyerBDD(float kwh);
};

#endif
