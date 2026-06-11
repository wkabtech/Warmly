<?php
require_once 'config.php';
require_once 'auth.php'; // 🔐 Authentifie via JWT

header('Content-Type: application/json');

// 🔄 Si appel POST pour ajouter consommation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['action'] ?? '') === 'ajouter') {
    $radiateur_id = $_POST['radiateur_id'] ?? null;
    $kwh = $_POST['consommation_kwh'] ?? null;
    $date = $_POST['date_heure'] ?? date('Y-m-d H:i:s');

    if (!$radiateur_id || !$kwh) {
        echo json_encode(["success" => false, "error" => "Paramètres manquants"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO consommations (radiateur_id, consommation_kwh, date_heure) VALUES (?, ?, ?)");
    $stmt->execute([$radiateur_id, $kwh, $date]);

    echo json_encode(["success" => true, "message" => "Consommation enregistrée"]);
    exit;
}

// ✅ Sinon, GET pour la consommation par période
$period = $_GET['period'] ?? 'day';
$date = $_GET['date'] ?? date('Y-m-d');

switch ($period) {
    case 'day':
        $start = date('Y-m-d 00:00:00', strtotime($date));
        $end   = date('Y-m-d 23:59:59', strtotime($date));
        break;
    case 'week':
        $start = date('Y-m-d 00:00:00', strtotime('monday this week', strtotime($date)));
        $end   = date('Y-m-d 23:59:59', strtotime($start . ' +6 days'));
        break;
    case 'month':
        $start = date('Y-m-01 00:00:00', strtotime($date));
        $end   = date('Y-m-t 23:59:59', strtotime($date));
        break;
    case 'year':
        $year = date('Y', strtotime($date));
        $start = "$year-01-01 00:00:00";
        $end   = "$year-12-31 23:59:59";
        break;
    default:
        echo json_encode(['error' => 'Période invalide.']);
        exit;
}

// 📊 Consommation par pièce
$sql = "
SELECT 
    p.nom AS piece,
    SUM(c.consommation_kwh) AS consommation
FROM consommations c
JOIN radiateurs r ON c.radiateur_id = r.id
JOIN pieces p ON r.piece_id = p.id
WHERE p.utilisateur_id = :user_id
  AND c.date_heure BETWEEN :start AND :end
GROUP BY p.id
";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    'user_id' => $userId,
    'start' => $start,
    'end' => $end
]);

$repartition = $stmt->fetchAll(PDO::FETCH_ASSOC);
$total = array_sum(array_column($repartition, 'consommation'));

// 📈 Construction du chartData selon la période
$chartData = [];

if ($period === 'day') {
    // 📅 Regroupé par heure
    $chartSql = "
        SELECT 
            HOUR(c.date_heure) AS heure,
            SUM(c.consommation_kwh) AS value
        FROM consommations c
        JOIN radiateurs r ON c.radiateur_id = r.id
        JOIN pieces p ON r.piece_id = p.id
        WHERE p.utilisateur_id = :user_id
          AND c.date_heure BETWEEN :start AND :end
        GROUP BY heure
        ORDER BY heure ASC
    ";

    $chartStmt = $pdo->prepare($chartSql);
    $chartStmt->execute(['user_id' => $userId, 'start' => $start, 'end' => $end]);
    $rows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 0; $i < 24; $i++) {
        $found = array_filter($rows, fn($r) => (int)$r['heure'] === $i);
        $chartData[] = [
            'day' => sprintf('%02dh', $i),
            'value' => $found ? (float)array_values($found)[0]['value'] : 0,
            'date' => date('Y-m-d', strtotime($date))
        ];
    }
}
elseif ($period === 'week') {
    // 📅 Regroupé par jour
    $daysFr = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

    $chartSql = "
        SELECT 
            DAYOFWEEK(c.date_heure) AS dayofweek,
            SUM(c.consommation_kwh) AS value
        FROM consommations c
        JOIN radiateurs r ON c.radiateur_id = r.id
        JOIN pieces p ON r.piece_id = p.id
        WHERE p.utilisateur_id = :user_id
          AND c.date_heure BETWEEN :start AND :end
        GROUP BY dayofweek
    ";

    $chartStmt = $pdo->prepare($chartSql);
    $chartStmt->execute(['user_id' => $userId, 'start' => $start, 'end' => $end]);
    $rows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 1; $i <= 7; $i++) {
        $found = array_filter($rows, fn($r) => (int)$r['dayofweek'] === $i);
        $chartData[] = [
            'day' => $daysFr[$i % 7],
            'value' => $found ? (float)array_values($found)[0]['value'] : 0,
            'date' => date('Y-m-d', strtotime("+".($i-1)." days", strtotime($start)))
        ];
    }
}
elseif ($period === 'month') {
    // 📅 Regroupé par semaine dans le mois : Semaine 1, 2, 3, 4
    $chartSql = "
        SELECT 
            WEEK(c.date_heure, 3) - WEEK(DATE_SUB(c.date_heure, INTERVAL DAYOFMONTH(c.date_heure)-1 DAY), 3) + 1 AS semaine_mois,
            SUM(c.consommation_kwh) AS value
        FROM consommations c
        JOIN radiateurs r ON c.radiateur_id = r.id
        JOIN pieces p ON r.piece_id = p.id
        WHERE p.utilisateur_id = :user_id
          AND c.date_heure BETWEEN :start AND :end
        GROUP BY semaine_mois
        ORDER BY semaine_mois ASC
    ";

    $chartStmt = $pdo->prepare($chartSql);
    $chartStmt->execute(['user_id' => $userId, 'start' => $start, 'end' => $end]);
    $rows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 1; $i <= 5; $i++) {
        $found = array_filter($rows, fn($r) => (int)$r['semaine_mois'] === $i);
        if ($found || $i <= 4) { // Ne pas afficher Semaine 5 si pas de données
            $chartData[] = [
                'day' => 'Semaine ' . $i,
                'value' => $found ? (float)array_values($found)[0]['value'] : 0,
                'date' => '' // Pas besoin ici
            ];
        }
    }
}
elseif ($period === 'year') {
    // 📅 Regroupé par mois
    $monthsFr = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai.', 'Juin', 'Juil.', 'Aoû.', 'Sep.', 'Oct.', 'Nov.', 'Déc.'];

    $chartSql = "
        SELECT 
            MONTH(c.date_heure) AS mois,
            SUM(c.consommation_kwh) AS value
        FROM consommations c
        JOIN radiateurs r ON c.radiateur_id = r.id
        JOIN pieces p ON r.piece_id = p.id
        WHERE p.utilisateur_id = :user_id
          AND c.date_heure BETWEEN :start AND :end
        GROUP BY mois
    ";

    $chartStmt = $pdo->prepare($chartSql);
    $chartStmt->execute(['user_id' => $userId, 'start' => $start, 'end' => $end]);
    $rows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

    for ($i = 1; $i <= 12; $i++) {
        $found = array_filter($rows, fn($r) => (int)$r['mois'] === $i);
        $chartData[] = [
            'day' => $monthsFr[$i-1],
            'value' => $found ? (float)array_values($found)[0]['value'] : 0,
            'date' => '' 
        ];
    }
}

// ✅ Réponse JSON finale
echo json_encode([
    'total' => round($total, 2),
    'repartition' => $repartition,
    'chartData' => $chartData
]);
