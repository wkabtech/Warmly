<?php
// === Connexion à la base de données ===
require_once 'config.php';
require_once 'auth.php'; // Vérification du token JWT

header('Content-Type: application/json');

// === Récupération des données POST ===
$device_id = $_POST['device_id'] ?? null;
$type = $_POST['type'] ?? null;
$value = isset($_POST['value']) ? (int)$_POST['value'] : null;
$init = isset($_POST['init']) ? filter_var($_POST['init'], FILTER_VALIDATE_BOOLEAN) : false;

// === Vérification des paramètres obligatoires ===
if (!$device_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Paramètre manquant : device_id'
    ]);
    exit();
}

// === Types autorisés ===
$allowed_types = ['temperature_notification', 'humidite_notification', 'mode_notification'];

// === Initialisation des préférences si init est vrai ===
if ($init) {
    try {
        $check = $pdo->prepare("SELECT * FROM preferences WHERE device_id = ?");
        $check->execute([$device_id]);

        if ($check->rowCount() === 0) {
            $insert = $pdo->prepare("INSERT INTO preferences (device_id, temperature_notification, humidite_notification, mode_notification) VALUES (?, 1, 1, 1)");
            $insert->execute([$device_id]);
            echo json_encode([
                'success' => true,
                'message' => "Préférences initialisées pour le device_id : $device_id"
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => "Préférences déjà existantes pour ce device_id."
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => "Erreur lors de l'initialisation des préférences : " . $e->getMessage()
        ]);
    }
    exit();
}

// === Si on n'est pas en mode init, récupération ou mise à jour ===
if (!$type) {
    // === Récupération des préférences ===
    try {
        $query = $pdo->prepare("SELECT temperature_notification, humidite_notification, mode_notification FROM preferences WHERE device_id = ?");
        $query->execute([$device_id]);

        $preferences = $query->fetch(PDO::FETCH_ASSOC);

        if ($preferences) {
            echo json_encode([
                'success' => true,
                'preferences' => $preferences
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Aucune préférence trouvée pour ce device_id.'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => "Erreur lors de la récupération des préférences : " . $e->getMessage()
        ]);
    }
} else {
    // === Mise à jour de la préférence ===
    if (!in_array($type, $allowed_types)) {
        echo json_encode([
            'success' => false,
            'message' => 'Type de notification invalide.'
        ]);
        exit();
    }

try {
    $sql = "UPDATE preferences SET $type = ? WHERE device_id = ? AND $type != ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$value, $device_id, $value]);
    $affectedRows = $stmt->rowCount();

    if ($affectedRows > 0) {
        echo json_encode([
            'success' => true,
            'message' => "Préférence mise à jour avec succès."
        ]);
    } else {
        echo json_encode([
            'success' => true,  // <-- Je mets 'true' ici car techniquement c'est déjà à jour
            'message' => "Préférence déjà à la valeur souhaitée."
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => "Erreur lors de la mise à jour : " . $e->getMessage()
    ]);
}

}
?>
