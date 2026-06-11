#pragma once

#include <Arduino.h>
#include <WiFiClient.h>

void setupOTA(const String& currentVersion, const String& firmwareBaseURL, WiFiClient& client);
void checkForOTA();
void checkOTAIntervalle();
void handleOTAMQTT(String topic, String payload);
void envoyerStatutFirmware(const String& status);
