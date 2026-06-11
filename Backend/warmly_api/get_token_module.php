<?php
require_once 'config.php';

header('Content-Type: application/json');

$nom_module = $_GET['module'] ?? null;

if (!$nom_module) {
    echo json_encode(["error" => "Nom du module manquant"]);
    exit;
}

$pdo = new PDO('mysql:host=localhost;dbname=warmly', 'root', '');

$stmt = $pdo->prepare("
    SELECT t.token
    FROM tokens t
    JOIN utilisateurs u ON u.id = t.utilisateur_id
    WHERE u.nom = ?
    ORDER BY t.id DESC LIMIT 1
");
$stmt->execute([$nom_module]);

$data = $stmt->fetch(PDO::FETCH_ASSOC);

if ($data && $data['token']) {
    echo json_encode(["token" => $data['token']]);
} else {
    echo json_encode(["error" => "Token non trouvé"]);
}
