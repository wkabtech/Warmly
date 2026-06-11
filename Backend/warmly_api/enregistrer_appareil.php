<?php
// 🔄 Importer la configuration
require_once 'config.php';

// 1️⃣ Récupération des données POST
$utilisateur_id = $_POST['utilisateur_id'] ?? null;
$device_id = $_POST['device_id'] ?? null;
$fcm_token = $_POST['fcm_token'] ?? null;

if (!$utilisateur_id || !$device_id || !$fcm_token) {
    http_response_code(400);
    echo json_encode(["message" => "❌ Données manquantes"]);
    exit;
}

// 2️⃣ Vérification de l'existence de l'appareil
$query = $pdo->prepare("SELECT id FROM fcm_tokens WHERE device_id = :device_id AND utilisateur_id = :utilisateur_id");
$query->execute([
    'device_id' => $device_id,
    'utilisateur_id' => $utilisateur_id
]);

if ($query->rowCount() > 0) {
    // 3️⃣ Mise à jour du fcm_token existant
    $update = $pdo->prepare("UPDATE fcm_tokens SET fcm_token = :fcm_token WHERE device_id = :device_id AND utilisateur_id = :utilisateur_id");
    $update->execute([
        'fcm_token' => $fcm_token,
        'device_id' => $device_id,
        'utilisateur_id' => $utilisateur_id
    ]);
    echo json_encode(["message" => "✅ Token FCM mis à jour"]);
} else {
    // 4️⃣ Insertion d'un nouvel enregistrement
    $insert = $pdo->prepare("INSERT INTO fcm_tokens (utilisateur_id, device_id, fcm_token) VALUES (:utilisateur_id, :device_id, :fcm_token)");
    $insert->execute([
        'utilisateur_id' => $utilisateur_id,
        'device_id' => $device_id,
        'fcm_token' => $fcm_token
    ]);
    echo json_encode(["message" => "✅ Appareil enregistré avec Token FCM"]);
}
?>
