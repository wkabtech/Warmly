<?php
require_once 'config.php';
require_once 'vendor/autoload.php';
$secretKey = require 'jwt_secret.php';

use Firebase\JWT\JWT;

header('Content-Type: application/json');

// ✅ Récupération des données envoyées en POST (JSON brut)
$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

// 🧪 Validation
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Champs manquants.']);
    exit;
}

// 🔎 Recherche utilisateur (par nom ou email)
$stmt = $pdo->prepare("SELECT * FROM utilisateurs WHERE nom = :identifiant OR email = :identifiant");
$stmt->execute(['identifiant' => $username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// 🔐 Vérification du mot de passe
if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Identifiants invalides.']);
    exit;
}

// 🔁 Génération du token JWT
$expiration = (new DateTime('+1 month'))->format('Y-m-d H:i:s');
$payload = [
    'sub' => $user['id'],
    'email' => $user['email'],
    'exp' => strtotime($expiration)
];
$jwt = JWT::encode($payload, $secretKey, 'HS256');

// 💾 Enregistrement dans la table tokens
$stmt = $pdo->prepare("INSERT INTO tokens (utilisateur_id, token, exp) VALUES (?, ?, ?)");
$stmt->execute([$user['id'], $jwt, $expiration]);

// ✅ Réponse
echo json_encode([
    'success' => true,
    'message' => 'Connexion réussie.',
    'token' => $jwt,
    'utilisateur_id' => $user['id'],
    'nom' => $user['nom'],
    'email' => $user['email']
]);
