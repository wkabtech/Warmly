#include <Arduino.h> // Inclusion de la bibliothèque arduino 
#include "FilPilote.h" // inclure le ficher d'en-tête 
#include <PubSubClient.h> // inclure la communication MQTT 
#include <Ticker.h>

//constructeur de la classe Fil Pilote 
FilPilote::FilPilote(int gpioAlterPositif,int gpioAlterNegatif)
{
    /*
        Stocke le GPIO pour les alternances négative, positive. 
        Configuration du GPIO positif comme sortie.
        Configuration du GPIO negatif comme sortie.
    */
    
    gpioAlternancePositive = gpioAlterPositif;
    gpioAlternanceNegative = gpioAlterNegatif;
   
    pinMode(gpioAlternancePositive, OUTPUT);
    pinMode(gpioAlternanceNegative, OUTPUT);
}

// fonction mode confort.
void FilPilote::confort()
{
    /*
      Eco = Demi-alternance positive : Signal sinusoidale 220V 
      GPIO positif LOW (LED verte allumé), 
      (1-1)
    */
    digitalWrite(gpioAlternancePositive, LOW); 
    digitalWrite(gpioAlternanceNegative, LOW);
}

// fonction mode eco.
void FilPilote::eco()
{
  /*
      Confort = aucun signal : les GPIO sont en élevé. (0-0) (Alternace positif = éteinte, alternance negatif = eteinte)
  */
    digitalWrite(gpioAlternancePositive, HIGH); 
    digitalWrite(gpioAlternanceNegative, HIGH);
}

// fonction mode hors-Gel.
void FilPilote::horsGel()
    /*  
        Le mode arret emis que des signals demi alternance positive (0-1): 
        GPIO positif LOW (LED verte Allumée), GPIO négatif HIGH (LED rouge éteinte)
    */
{
  digitalWrite(gpioAlternancePositive, LOW); 
  digitalWrite(gpioAlternanceNegative, HIGH); 
}

// fonction mode arrêt.
void FilPilote::arret()

  /*
   hors-gel = Demi-alternance négative : (1-0)
   GPIO positof HIGH (LED verte éteinte), GPIO négatif LOW (LED rouge Allumée) 
 */
{
  digitalWrite(gpioAlternancePositive, HIGH); 
  digitalWrite(gpioAlternanceNegative, LOW);
}

// fonction mode Confort -1.
void FilPilote::confortMoins1() {
    timerConfortMoins.detach();
    dureeRepos = 297;  // 4 min 57 s
    dureeSignal = 3;
    etatSignal = false;

    timerConfortMoins.once(dureeRepos, [this]() {
        // Signal complet
        digitalWrite(gpioAlternancePositive, HIGH);
        digitalWrite(gpioAlternanceNegative, HIGH);
        pinMode(gpioAlternancePositive, OUTPUT);
        pinMode(gpioAlternanceNegative, OUTPUT);
        etatSignal = true;

        timerConfortMoins.once(dureeSignal, [this]() {
            // Aucun signal
            pinMode(gpioAlternancePositive, INPUT);
            pinMode(gpioAlternanceNegative, INPUT);
            etatSignal = false;
            confortMoins1();  // relance le cycle
        });
    });

    // démarrage immédiat sans signal
    pinMode(gpioAlternancePositive, INPUT);
    pinMode(gpioAlternanceNegative, INPUT);
    Serial.println("▶️ Début cycle Confort -1°C");
}

// fonction mode confort -2
void FilPilote::confortMoins2() {
    timerConfortMoins.detach();
    dureeRepos = 293;  // 4 min 53 s
    dureeSignal = 7;
    etatSignal = false;

    timerConfortMoins.once(dureeRepos, [this]() {
        digitalWrite(gpioAlternancePositive, HIGH);
        digitalWrite(gpioAlternanceNegative, HIGH);
        pinMode(gpioAlternancePositive, OUTPUT);
        pinMode(gpioAlternanceNegative, OUTPUT);
        etatSignal = true;

        timerConfortMoins.once(dureeSignal, [this]() {
            pinMode(gpioAlternancePositive, INPUT);
            pinMode(gpioAlternanceNegative, INPUT);
            etatSignal = false;
            confortMoins2();  // boucle
        });
    });

    pinMode(gpioAlternancePositive, INPUT);
    pinMode(gpioAlternanceNegative, INPUT);
    Serial.println("▶️ Début cycle Confort -2°C");
}

// Fonction pour commander les ordres fu Fil Pilote
void FilPilote::commandeOrdres(const String& ordre) 
{
    if (ordre == "confort") {
        timerConfortMoins.detach();
        confort();
        Serial.println("Mode : confort (1)");
    } else if (ordre == "eco") {
        timerConfortMoins.detach();
        eco();
        Serial.println("Mode : eco (2)");
    } else if (ordre == "arret") {
        timerConfortMoins.detach();
        arret();
        Serial.println("Mode : arrêt (3)");
    } else if (ordre == "hors-gel") {
        timerConfortMoins.detach();
        horsGel();
        Serial.println("Mode : hors-Gel (4)");
    } else if (ordre == "confort-1") {
        confortMoins1();
        Serial.println("Mode : confort -1");
    } else if (ordre == "confort-2") {
        confortMoins2();
        Serial.println("Mode : confort -2");
    } else {
        Serial.println("Erreur : ordre inconnu !");
    }
}
