<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'erreur' => 'Méthode non autorisée.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $sql = "
        SELECT
            s.id,
            s.prestataire_id,
            s.type_service,
            s.categorie_service,
            s.titre,
            s.description,
            s.destination,
            s.lieu_depart,
            s.duree,
            s.prix_indicatif
        FROM prestataire_services s
        INNER JOIN prestataires p ON p.id = s.prestataire_id
        WHERE p.statut = 'publie'
          AND s.statut = 'publie'
        ORDER BY s.prestataire_id ASC, s.type_service ASC, s.titre ASC
    ";

    echo json_encode([
        'success' => true,
        'data' => $pdo->query($sql)->fetchAll()
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Impossible de charger les plats et les offres.'
    ], JSON_UNESCAPED_UNICODE);
}
