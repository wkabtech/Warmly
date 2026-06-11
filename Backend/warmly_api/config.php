<?php
// config.php — sans header ici, seulement DB

$host = "localhost";
$dbname = "warmly";
$username = "root"; 
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Connexion échouée : " . $e->getMessage()]);
    exit();
}
