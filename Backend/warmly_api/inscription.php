<?php
require_once 'config.php';
require_once 'vendor/autoload.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée.']);
    exit;
}

$nom = trim($_POST['nom'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

if (!$nom || !$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Tous les champs sont requis.']);
    exit;
}

// Vérification unicité de l'email
$stmt = $pdo->prepare("SELECT id FROM utilisateurs WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'Email déjà utilisé.']);
    exit;
}

// Vérification unicité du nom d'utilisateur
$stmt = $pdo->prepare("SELECT id FROM utilisateurs WHERE nom = ?");
$stmt->execute([$nom]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'Nom d\'utilisateur déjà utilisé.']);
    exit;
}

// Création de l'utilisateur
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO utilisateurs (nom, email, password) VALUES (?, ?, ?)");
$stmt->execute([$nom, $email, $hashedPassword]);
$userId = $pdo->lastInsertId();

echo json_encode([
    'success' => true,
    'message' => 'Inscription réussie.',
    'utilisateur_id' => $userId
]);
