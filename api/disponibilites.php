<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$prestataireId = filter_var(
    $_GET['prestataire_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$prestataireId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'erreur' => 'Identifiant de prestataire invalide.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $requete = $pdo->prepare(
        "SELECT date_disponibilite
         FROM disponibilites
         WHERE prestataire_id = :prestataire_id
           AND est_disponible = 1
           AND date_disponibilite >= CURDATE()
         ORDER BY date_disponibilite ASC"
    );

    $requete->execute(['prestataire_id' => $prestataireId]);

    echo json_encode([
        'success' => true,
        'data' => $requete->fetchAll(PDO::FETCH_COLUMN)
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Impossible de charger les disponibilités.'
    ], JSON_UNESCAPED_UNICODE);
}
