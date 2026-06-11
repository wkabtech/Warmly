<?php
require_once 'config.php';
require_once 'auth.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['timeSlots']) || !is_array($data['timeSlots'])) {
        echo json_encode(['status' => 'error', 'message' => 'Données invalides']);
        exit;
    }

    if ($action === 'supprimer') {
        $stmt = $pdo->prepare("DELETE FROM programmation WHERE piece_id = ? AND date_heure = ?");
        foreach ($data['timeSlots'] as $slot) {
            $stmt->execute([$slot['piece_id'], $slot['date_heure']]);
        }
        echo json_encode(['status' => 'success']);
        exit;
    }

    foreach ($data['timeSlots'] as $slot) {
        $piece_id = $slot['piece_id'];
        $date_heure = $slot['date_heure'];
        $mode = $slot['mode'];

        $stmt = $pdo->prepare("SELECT id FROM programmation WHERE piece_id = ? AND date_heure = ?");
        $stmt->execute([$piece_id, $date_heure]);

        if ($stmt->fetch()) {
            $stmtUpdate = $pdo->prepare("UPDATE programmation SET mode = ? WHERE piece_id = ? AND date_heure = ?");
            $stmtUpdate->execute([$mode, $piece_id, $date_heure]);
        } else {
            $stmtInsert = $pdo->prepare("INSERT INTO programmation (piece_id, date_heure, mode) VALUES (?, ?, ?)");
            $stmtInsert->execute([$piece_id, $date_heure, $mode]);
        }
    }

    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'lister') {
    $stmt = $pdo->prepare("
        SELECT p.id, p.nom as room, pr.date_heure, pr.mode
        FROM programmation pr
        JOIN pieces p ON pr.piece_id = p.id
        WHERE p.utilisateur_id = ?
    ");
    $stmt->execute([$userId]);
    $slots = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $date = new DateTime($row['date_heure']);
        $weekStart = (clone $date)->modify('monday this week');

        $slots[] = [
            'id' => $row['id'],
            'room' => $row['room'],
            'piece_id' => $row['id'],
            'week_start' => $weekStart->format('Y-m-d'),
            'day' => (int)$date->format('w') - 1 < 0 ? 6 : (int)$date->format('w') - 1,
            'hour' => (int)$date->format('H'),
            'mode' => $row['mode'],
        ];
    }

    echo json_encode(['success' => true, 'slots' => $slots]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Action non supportée']);
