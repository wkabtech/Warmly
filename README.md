# 🌡️ Warmly – Écosystème IoT pour Radiateurs Connectés

**Warmly** est une alternative personnelle et améliorée à la solution Heatzy, développée de manière autonome dans le cadre de mon BTS CIEL (Cybersécurité, Informatique et réseaux, Électronique). Ce projet permet de piloter, automatiser et superviser des radiateurs électriques à distance.

---

## 📷 Démonstration Vidéo
👉 **[Regarder la vidéo de présentation et de démonstration (YouTube)](https://youtu.be/BLQS33lYxwc)**

---

## 🎯 Objectifs du projet
* **Pilotage à distance :** Contrôle de radiateurs via une application mobile multiplateforme.
* **Automatisation :** Création et application d'un planning de chauffe intelligent.
* **Supervision (Observabilité) :** Suivi en temps réel (graphiques) de la consommation électrique, de la température et de l'humidité.
* **Alerting :** Système de notifications push instantanées lors des changements d'état ou d'anomalies.

---

## 🔧 Stack Technique & Protocoles
* **Matériel (IoT) :** Microcontrôleur **ESP8266** (C++ Arduino), capteurs environnementaux, gestion du Fil Pilote.
* **Réseau & Protocoles :** **MQTT** (Script JS), HTTP / REST, requêtes asynchrones, Wi-Fi.
* **Backend / Serveur :** API PHP + Node.js sur **serveur LAMP** (Linux, Apache, MySQL, PHP).
* **Application Mobile :** React Native (TypeScript).

---

## 📁 Structure du dépôt
Pour faciliter la maintenance et la lecture, le projet est découpé par composants :
* `/mobile-app` : Code source de l'application mobile.
* `/backend` : API PHP, scripts Node.js et structure de la base de données.
* `/esp8266-firmware` : Code embarqué (C++) du microcontrôleur.
* `/scripts` : Scripts utilitaires (dont la gestion du protocole MQTT).

---

## 🛠️ Compétences Support, Système & Réseau développées
Ce projet valide des compétences clés directement transférables au **Support Informatique et à l'Administration Système** :

* **Administration & Système (Linux/LAMP) :** * Déploiement et sécurisation d'un serveur web Linux.
  * Gestion et requêtage d'une base de données relationnelle (MySQL/MariaDB).
  * Maintenance du serveur : gestion des droits d'accès, nettoyage et optimisation de la BDD.
* **Réseau & Protocoles :**
  * Configuration réseau de l'ESP8266 (appairage Wi-Fi, attribution IP).
  * Utilisation de protocoles légers et industriels (**MQTT**) et d'architectures d'API (REST).
* **Troubleshooting & Analyse (Le cœur du métier de support) :**
  * **Analyse de logs** serveur et applicatifs pour identifier les pannes.
  * Diagnostic et résolution de dysfonctionnements réseau (pertes de paquets, timeouts, codes d'erreur HTTP).
  * Tests d'intégration et débogage matériel/logiciel en autonomie.

---

## 🙋‍♂️ Auteur
* **LinkedIn :** linkedin.com/in/walidkabli
* **GitHub :** github.com/wkabtech

