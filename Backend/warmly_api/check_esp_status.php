<?php
$filename = __DIR__ . '/esp_connected.json';

header('Content-Type: application/json');

// ✅ Vérifie que c'est un GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($filename)) {
        echo json_encode(['connected' => false, 'message' => 'Aucune info reçue']);
        exit;
    }

    $data = json_decode(file_get_contents($filename), true);

    // Optionnel : limite de validité à 30 secondes
    if (time() - $data['timestamp'] > 30) {
        unlink($filename); // supprime l’ancien fichier
        echo json_encode(['connected' => false, 'message' => 'Données expirées']);
        exit;
    }

    echo json_encode(['connected' => true, 'chip_id' => $data['chip_id']]);
    exit;
}

// ❌ Méthode non autorisée
http_response_code(405);
echo json_encode(['connected' => false, 'error' => 'Méthode non autorisée']);
exit;
?>
