<?php
require_once 'config.php';
require_once 'auth.php'; // Pour récupérer $userId
header('Content-Type: application/json');

// 🔽 Récupère les données JSON
$input = json_decode(file_get_contents('php://input'), true);
$ancien = $input['ancien'] ?? '';
$nouveau = $input['nouveau'] ?? '';

if (!$ancien || !$nouveau) {
    echo json_encode(['error' => 'Champs requis.']);
    exit;
}

// 🔐 Vérifie l'ancien mot de passe
$stmt = $pdo->prepare("SELECT password FROM utilisateurs WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || !password_verify($ancien, $user['password'])) {
    echo json_encode(['error' => 'Mot de passe actuel incorrect.']);
    exit;
}

// 🔄 Mise à jour avec le nouveau mot de passe hashé
$hash = password_hash($nouveau, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("UPDATE utilisateurs SET password = ? WHERE id = ?");
$stmt->execute([$hash, $userId]);

echo json_encode(['success' => true, 'message' => 'Mot de passe mis à jour.']);
