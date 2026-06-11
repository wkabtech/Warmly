<?php
$dir = __DIR__; // 📂 On utilise directement le dossier actuel (warmly_api)

header('Content-Type: application/json');

// === POST: L'ESP envoie son état ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['chip_id']) || !isset($input['firmware_version']) || !isset($input['update_status'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Paramètres manquants']);
        exit;
    }

    $file = "$dir/fw_{$input['chip_id']}.json";
    file_put_contents($file, json_encode([
        'chip_id' => $input['chip_id'],
        'firmware_version' => $input['firmware_version'],
        'update_status' => $input['update_status'],
        'timestamp' => time()
    ]));

    echo json_encode(['success' => true]);
    exit;
}

// === GET: L'application mobile lit l'état de l’ESP ===
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['chip_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'chip_id manquant']);
        exit;
    }

    $file = "$dir/fw_{$_GET['chip_id']}.json";
    if (!file_exists($file)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Aucune donnée disponible']);
        exit;
    }

    $data = json_decode(file_get_contents($file), true);
    echo json_encode(['success' => true] + $data);
    exit;
}

// ❌ Autre méthode HTTP non autorisée
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
?>
