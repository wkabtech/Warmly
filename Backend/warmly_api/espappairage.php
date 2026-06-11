<?php
// 📌 Chemin vers le dossier temporaire
$filename = __DIR__ . '/esp_connected.json';

header('Content-Type: application/json');

// ✅ Vérifie que c'est un POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['chip_id']) || !isset($input['status'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
        exit;
    }

    // 📝 Sauvegarde temporairement l’état de l’ESP
    file_put_contents($filename, json_encode([
        'chip_id' => $input['chip_id'],
        'status' => $input['status'],
        'timestamp' => time()
    ]));

    echo json_encode(['success' => true, 'message' => 'Statut enregistré']);
    exit;
}

// ❌ Méthode non autorisée
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
exit;
?>
