<?php
require_once 'config.php';
require_once 'auth.php'; // 🔐 Authentifie l’utilisateur via JWT

header('Content-Type: application/json');

// 🕒 Heure actuelle
$now = new DateTime();

// 🔍 Recherche la dernière programmation passée pour chaque pièce de l'utilisateur
$sql = "
    SELECT pr.piece_id, pr.mode
    FROM programmation pr
    JOIN pieces p ON pr.piece_id = p.id
    WHERE p.utilisateur_id = :user_id
      AND pr.date_heure <= :now
    ORDER BY pr.date_heure DESC
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    'user_id' => $userId,
    'now' => $now->format('Y-m-d H:i:s')
]);

$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result) {
    echo json_encode([
        'piece_id' => $result['piece_id'],
        'mode' => $result['mode']
    ]);
} else {
    echo json_encode([
        'message' => 'Aucune programmation active.'
    ]);
}
