<?php
// === Connexion à la base de données ===
require_once 'config.php';
require_once 'auth.php'; // Vérification du token JWT

header('Content-Type: application/json');

// === Récupération des données POST ===
$device_id = $_POST['device_id'] ?? null;

// === Vérification des paramètres ===
if (!$device_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Paramètre manquant : device_id'
    ]);
    exit();
}

try {
    $delete = $pdo->prepare("DELETE FROM preferences WHERE device_id = ?");
    $delete->execute([$device_id]);

    if ($delete->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => "Préférences supprimées pour le device_id : $device_id"
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => "Aucune préférence trouvée pour ce device_id."
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => "Erreur lors de la suppression des préférences : " . $e->getMessage()
    ]);
}
?>
