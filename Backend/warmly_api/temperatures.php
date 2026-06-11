<?php
require 'config.php';

header('Content-Type: application/json');

if (!isset($_GET['action'])) {
    echo json_encode(["error" => "Aucune action spécifiée"]);
    exit();
}

$action = $_GET['action'];

if ($action == 'ajouter') {
    $radiateur_id = $_POST['radiateur_id'] ?? null;
    $temperature = $_POST['temperature'] ?? null;
    $humidite = $_POST['humidite'] ?? null;

    if (!$radiateur_id || $temperature === null || $humidite === null) {
        echo json_encode(["error" => "Paramètres manquants."]);
        exit();
    }

    // Vérifie si une température et une humidité existent déjà
    $stmt = $pdo->prepare("SELECT id FROM temperatures WHERE radiateur_id = ?");
    $stmt->execute([$radiateur_id]);
    $exist = $stmt->fetch();

    if ($exist) {
        // Met à jour la température et l'humidité
        $stmt = $pdo->prepare("UPDATE temperatures SET temperature = ?, humidite = ?, date_heure = NOW() WHERE radiateur_id = ?");
        $stmt->execute([$temperature, $humidite, $radiateur_id]);
    } else {
        // Ajoute la température et l'humidité si aucune entrée
        $stmt = $pdo->prepare("INSERT INTO temperatures (radiateur_id, temperature, humidite) VALUES (?, ?, ?)");
        $stmt->execute([$radiateur_id, $temperature, $humidite]);
    }

    echo json_encode(["message" => "Température et humidité enregistrées."]);
}

elseif ($action == 'actuelle') {
    $radiateur_id = $_GET['radiateur_id'] ?? null;

    if (!$radiateur_id) {
        echo json_encode(["error" => "ID radiateur manquant"]);
        exit();
    }

    // Requête pour obtenir la dernière température et humidité enregistrées
    $stmt = $pdo->prepare("SELECT temperature, humidite FROM temperatures WHERE radiateur_id = ? ORDER BY date_heure DESC LIMIT 1");
    $stmt->execute([$radiateur_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Vérifie si les valeurs existent et ne sont pas NULL
    $temperature = $result['temperature'] ?? 'N/A';
    $humidite = $result['humidite'] ?? 'N/A';

    echo json_encode([
        "temperature" => $temperature,
        "humidite" => $humidite
    ]);
}

elseif ($action == 'liste') {
    // Récupère la liste des pièces avec leur température et humidité moyenne
    $stmt = $pdo->query("
        SELECT 
            pieces.nom AS piece,
            ROUND(AVG(temperatures.temperature), 1) AS temperature,
            ROUND(AVG(temperatures.humidite), 1) AS humidite
        FROM radiateurs
        INNER JOIN pieces ON pieces.id = radiateurs.piece_id
        LEFT JOIN temperatures ON temperatures.radiateur_id = radiateurs.id
        WHERE temperatures.temperature IS NOT NULL AND temperatures.humidite IS NOT NULL
        GROUP BY pieces.id
    ");
    
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["rooms" => $rooms]);
}

else {
    echo json_encode(["error" => "Action non valide"]);
}
?>
