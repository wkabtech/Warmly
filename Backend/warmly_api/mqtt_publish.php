<?php
require_once("config.php");
require_once("phpMQTT.php"); // ➕ Assure-toi que ce fichier est bien dans le dossier

function publishMQTT($topic, $message, $qos = 0, $retain = false) {
    $server = "localhost";     // 🟡 Adresse du broker MQTT (ex: Mosquitto)
    $port = 1883;              // Port MQTT standard
    $client_id = "warmly_php_" . uniqid(); // ID client unique

    $mqtt = new phpMQTT($server, $port, $client_id);

    if (!$mqtt->connect()) {
        error_log("❌ Échec de connexion au serveur MQTT.");
        return false;
    }

    $mqtt->publish($topic, $message, $qos, $retain);
    $mqtt->close();
    return true;
}
