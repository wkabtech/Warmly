<?php
require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: application/json');

// 🔐 Clé secrète
$secretKey = require 'jwt_secret.php';

// ✅ Fonction robuste pour lire le header Authorization (adaptée à WAMP, Nginx, Apache...)
function getAuthorizationHeader() {
    if (isset($_SERVER['Authorization'])) {
        return trim($_SERVER["Authorization"]);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_change_key_case($requestHeaders, CASE_LOWER);
        if (isset($requestHeaders['authorization'])) {
            return trim($requestHeaders['authorization']);
        }
    }
    return null;
}

// 📥 Récupération du token via la nouvelle fonction
$authHeader = getAuthorizationHeader();
if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    echo json_encode(["error" => "Authorization header missing or invalid"]);
    exit();
}

$token = $matches[1]; // 🎯 Token extrait

try {
    // ✅ Vérification + décodage
    $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));

    if ($decoded->exp < time()) {
        echo json_encode(["error" => "Token expiré"]);
        exit();
    }

    // 🔍 Vérifie si le token est encore valide en BDD
    $stmt = $pdo->prepare("SELECT utilisateur_id FROM tokens WHERE token = ?");
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(["error" => "Token invalide ou révoqué"]);
        exit();
    }

    // ✅ Authentification réussie
    $userId = $row['utilisateur_id'];
    // (optionnel) tu peux définir $userId comme global ici si besoin dans d'autres fichiers
    // global $userId;
} catch (Exception $e) {
    echo json_encode(["error" => "Token invalide : " . $e->getMessage()]);
    exit();
}
