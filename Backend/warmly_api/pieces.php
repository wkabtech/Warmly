<?php
require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: application/json');

// 🔐 Authentification via JWT
$headers = array_change_key_case(getallheaders(), CASE_LOWER);
if (!isset($headers['authorization']) || !preg_match('/Bearer\s(\S+)/', $headers['authorization'], $matches)) {
    echo json_encode(["error" => "Authorization header manquant ou invalide"]);
    exit;
}

$jwt = $matches[1];
$secretKey = require 'jwt_secret.php';

try {
    $decoded = JWT::decode($jwt, new Key($secretKey, 'HS256'));
    $utilisateur_id = $decoded->sub; // ✅ ID de l'utilisateur authentifié
} catch (Exception $e) {
    echo json_encode(["error" => "Token invalide", "details" => $e->getMessage()]);
    exit;
}

// 🎬 Action API
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'lister':
        $stmt = $pdo->prepare("SELECT * FROM pieces WHERE utilisateur_id = ?");
        $stmt->execute([$utilisateur_id]);
        $pieces = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "pieces" => $pieces
        ]);
        break;

    case 'ajouter':
        require_once 'auth.php'; // Pour récupérer $userId à partir du token
    
        $nom = trim($_POST['nom'] ?? '');
    
        if (empty($nom)) {
            echo json_encode(["success" => false, "error" => "Nom manquant"]);
            exit;
        }
    
        // 🔎 Vérifie si une pièce avec le même nom existe déjà pour cet utilisateur
        $stmt = $pdo->prepare("SELECT id FROM pieces WHERE nom = :nom AND utilisateur_id = :utilisateur_id");
        $stmt->execute([
            'nom' => $nom,
            'utilisateur_id' => $userId
        ]);
        if ($stmt->fetch()) {
            echo json_encode(["success" => false, "error" => "Une pièce avec ce nom existe déjà."]);
            exit;
        }
    
        // ➕ Insertion
        $stmt = $pdo->prepare("INSERT INTO pieces (nom, utilisateur_id) VALUES (:nom, :utilisateur_id)");
        $result = $stmt->execute([
            'nom' => $nom,
            'utilisateur_id' => $userId
        ]);
    
        echo json_encode(["success" => $result]);
        break;
        
    case 'supprimer':
        $id = $_POST['id'] ?? null;

        if (!$id) {
            echo json_encode(["success" => false, "error" => "ID manquant"]);
            exit;
        }

        // 🔒 Supprimer uniquement si ça appartient à l'utilisateur
        $stmt = $pdo->prepare("DELETE FROM pieces WHERE id = :id AND utilisateur_id = :utilisateur_id");
        $result = $stmt->execute(['id' => $id, 'utilisateur_id' => $utilisateur_id]);

        echo json_encode(["success" => $result]);
        break;

    case 'mode_prog':
        $piece_id = $_POST['piece_id'] ?? null;
        $mode_prog = $_POST['mode_prog'] ?? null;

        if (!$piece_id || $mode_prog === null) {
            echo json_encode(["success" => false, "error" => "Paramètres manquants"]);
            exit;
        }

        // 🔒 Vérifie que la pièce appartient à l'utilisateur
        $stmt = $pdo->prepare("UPDATE pieces SET mode_prog = :mode_prog WHERE id = :id AND utilisateur_id = :utilisateur_id");
        $result = $stmt->execute([
            'mode_prog' => $mode_prog,
            'id' => $piece_id,
            'utilisateur_id' => $utilisateur_id
        ]);

        echo json_encode(["success" => $result]);
        break;

    default:
        echo json_encode(["success" => false, "error" => "Action inconnue"]);
        break;
}
