#ifndef FIL_PILOTE_H
#define FIL_PILOTE_H
#include <Ticker.h>

// définition de la classe Fil_Pilote pour gérer les différents ordres envoyé sur le Fil Pilote.
class FilPilote 
{
private:

  int gpioAlternancePositive; // GPIO broche connectée a l'alternace positive 
  int gpioAlternanceNegative; // GPIO broche connectée a l'alternance negative
  int dureeRepos;
  int dureeSignal;
  bool etatSignal;
  Ticker timerConfortMoins;

public:
  // constructeur : initialiser les broches.
  FilPilote(int gpioAlterPositif, int gpioAlternNegatif);

  // Fonctions pour envoyer différents ordres au radiateur.

  void confort(); // Pas de signal.
  void eco(); // 220 Volts alternatif = Positif, Négatif.
  void arret(); // 220 volts Alternance Positive.
  void horsGel(); // 220 Volts Alternance Negatif.
  void confortMoins1(); // Signal temporisé.
  void confortMoins2(); // Signal temporisé.
  void commandeOrdres(const String& ordre);
};

#endif
