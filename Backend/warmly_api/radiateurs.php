<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// 🔎 Lister les radiateurs
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'lister') {
    $stmt = $pdo->query("
    SELECT r.id, r.nom, r.mode, r.piece_id, p.nom AS piece_nom, t.temperature, t.humidite
    FROM radiateurs r
    JOIN pieces p ON r.piece_id = p.id
    LEFT JOIN (
        SELECT radiateur_id, temperature, humidite
        FROM temperatures
        WHERE (radiateur_id, date_heure) IN (
            SELECT radiateur_id, MAX(date_heure)
            FROM temperatures
            GROUP BY radiateur_id
        )
    ) t ON r.id = t.radiateur_id
    ");
    $radiateurs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success" => true, "radiateurs" => $radiateurs]);
    exit();
}

// ➕ Ajouter un radiateur + Envoi MQTT
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'ajouter') {
    require_once 'phpMQTT.php';
    require_once 'mqtt_publish.php';

    $piece_id = $_POST['piece_id'] ?? null;
    $nom = trim($_POST['nom'] ?? '');
    $utilisateur_id = $_POST['utilisateur_id'] ?? null;
    $token = $_POST['token'] ?? '';
    $chip_id = $_POST['chip_id'] ?? null;

    if (!$piece_id || !$nom || !$utilisateur_id || !$token || !$chip_id) {
        echo json_encode(["error" => "Paramètres manquants."]);
        exit();
    }

    // Vérifie doublon
    $check = $pdo->prepare("SELECT id FROM radiateurs WHERE piece_id = ? AND nom = ?");
    $check->execute([$piece_id, $nom]);
    if ($check->fetch()) {
        echo json_encode(["error" => "Un radiateur avec ce nom existe déjà dans cette pièce."]);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO radiateurs (piece_id, nom, mode) VALUES (?, ?, 'confort')");
    if ($stmt->execute([$piece_id, $nom])) {
        $radiateur_id = $pdo->lastInsertId();

        // Construction du message JSON
        $payload = json_encode([
            "radiateur_id" => (int)$radiateur_id,
            "piece_id" => (int)$piece_id,
            "utilisateur_id" => (int)$utilisateur_id,
            "token" => $token
        ]);

        // Envoi sur le topic basé sur chip_id pour l’appairage
        $topicChip = "radiateur/$chip_id/init";
        $sentChip = publishMQTT($topicChip, $payload);

        // Envoi aussi sur topic utilisateur/pièce/radiateur/init pour cohérence
        $topicStandard = "radiateur/$utilisateur_id/$piece_id/$radiateur_id/init";
        $sentStandard = publishMQTT($topicStandard, $payload);

        echo json_encode([
            "success" => true,
            "radiateur_id" => $radiateur_id,
            "mqtt_sent_chip" => $sentChip,
            "mqtt_sent_standard" => $sentStandard,
            "message" => "Radiateur ajouté et messages MQTT envoyés."
        ]);
    } else {
        echo json_encode(["error" => "Erreur lors de l'ajout du radiateur."]);
    }
    exit();
}

// 🔄 Mettre à jour le token de l’ESP
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'mettre_a_jour_token') {
    require_once 'phpMQTT.php';
    require_once 'mqtt_publish.php';

    $radiateur_id = $_POST['radiateur_id'] ?? null;
    $piece_id = $_POST['piece_id'] ?? null;
    $utilisateur_id = $_POST['utilisateur_id'] ?? null;
    $token = $_POST['token'] ?? null;

    if (!$radiateur_id || !$piece_id || !$utilisateur_id || !$token) {
        echo json_encode(["error" => "Paramètres manquants."]);
        exit();
    }

    $payload = json_encode([
        "radiateur_id" => (int)$radiateur_id,
        "piece_id" => (int)$piece_id,
        "utilisateur_id" => (int)$utilisateur_id,
        "token" => $token
    ]);

    $topic = "radiateur/$utilisateur_id/$piece_id/$radiateur_id/init";
    $mqttSent = publishMQTT($topic, $payload);

    echo json_encode([
        "success" => true,
        "message" => "Token mis à jour et envoyé à l’ESP.",
        "mqtt_sent" => $mqttSent
    ]);
    exit();
}

// 📝 Modifier le mode
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'modifier_mode') {
    require_once 'phpMQTT.php';
    require_once 'mqtt_publish.php';

    $radiateur_id = $_POST['radiateur_id'] ?? null;
    $mode = $_POST['mode'] ?? null;
    $utilisateur_id = $_POST['utilisateur_id'] ?? null;

    if (!$radiateur_id || !$mode || !$utilisateur_id) {
        echo json_encode(["error" => "Paramètres manquants."]);
        exit();
    }

    // 🛡️ Vérifie que le mode est valide
    $modes_valides = ['confort', 'eco', 'hors-gel', 'arret'];
    if (!in_array($mode, $modes_valides)) {
        echo json_encode(["error" => "Mode invalide."]);
        exit();
    }

    // 🔄 Met à jour la base
    $stmt = $pdo->prepare("UPDATE radiateurs SET mode = ? WHERE id = ?");
    $successDB = $stmt->execute([$mode, $radiateur_id]);

    // 🔍 Récupère la pièce associée
    $stmt2 = $pdo->prepare("SELECT piece_id FROM radiateurs WHERE id = ?");
    $stmt2->execute([$radiateur_id]);
    $row = $stmt2->fetch();
    $piece_id = $row['piece_id'] ?? null;

    if (!$piece_id) {
        echo json_encode(["error" => "Pièce introuvable pour ce radiateur."]);
        exit();
    }

    // 📡 Envoie MQTT
    $topic = "radiateur/$utilisateur_id/$piece_id/$radiateur_id/mode";
    $successMQTT = publishMQTT($topic, $mode);

    echo json_encode([
        "success" => $successDB,
        "message" => "Mode mis à jour et message MQTT publié",
        "topic" => $topic,
        "mode" => $mode,
        "mqtt" => $successMQTT
    ]);
    exit();
}

// 🔁 Déplacer un radiateur
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'deplacer') {
    require_once 'phpMQTT.php';
    require_once 'mqtt_publish.php';

    $radiateur_id = $_POST['radiateur_id'] ?? null;
    $nouvelle_piece_id = $_POST['nouvelle_piece_id'] ?? null;
    $utilisateur_id = $_POST['utilisateur_id'] ?? null;
    $token = $_POST['token'] ?? null;

    if (!$radiateur_id || !$nouvelle_piece_id || !$utilisateur_id || !$token) {
        echo json_encode(["error" => "Paramètres manquants."]);
        exit();
    }

    $stmt = $pdo->prepare("UPDATE radiateurs SET piece_id = ? WHERE id = ?");
    if ($stmt->execute([$nouvelle_piece_id, $radiateur_id])) {
        $payload = json_encode([
            "radiateur_id" => (int)$radiateur_id,
            "piece_id" => (int)$nouvelle_piece_id,
            "utilisateur_id" => (int)$utilisateur_id,
            "token" => $token
        ]);

        $topic = "radiateur/$utilisateur_id/$nouvelle_piece_id/$radiateur_id/init";
        $mqttSent = publishMQTT($topic, $payload);

        echo json_encode([
            "success" => true,
            "message" => "Radiateur déplacé et MQTT envoyé.",
            "mqtt_sent" => $mqttSent
        ]);
    } else {
        echo json_encode(["error" => "Erreur lors du déplacement."]);
    }
    exit();
}

// ❌ Supprimer un radiateur
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'supprimer') {
    $radiateur_id = $_POST['radiateur_id'] ?? null;

    if (!$radiateur_id) {
        echo json_encode(["error" => "ID radiateur manquant."]);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM radiateurs WHERE id = ?");
    if ($stmt->execute([$radiateur_id])) {
        echo json_encode(["success" => true, "message" => "Radiateur supprimé."]);
    } else {
        echo json_encode(["error" => "Erreur lors de la suppression."]);
    }
    exit();
}

echo json_encode(["error" => "Méthode ou action non autorisée."]);
