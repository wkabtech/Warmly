<?php
require_once 'config.php';
require_once 'vendor/autoload.php';

header('Content-Type: application/json');

// 📥 Récupère le token dans l'en-tête Authorization (Bearer ...).
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    echo json_encode(['error' => 'Aucun token valide fourni.']);
    exit;
}

$token = $matches[1];

try {
    // 🔍 On démarre une transaction SQL.
    $pdo->beginTransaction();

    // 🔐 Supprimer le token de la table tokens.
    $stmt = $pdo->prepare("DELETE FROM tokens WHERE token = :token");
    $stmt->execute(['token' => $token]);

    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Déconnexion réussie.']);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['error' => 'Erreur lors de la déconnexion : ' . $e->getMessage()]);
}
