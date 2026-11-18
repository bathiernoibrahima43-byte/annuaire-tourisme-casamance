<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'erreur' => 'Méthode non autorisée.'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $sql = "
        SELECT p.id AS prestataire_id,
               d.type_cuisine, d.nom_chef, d.village_quartier,
               d.lieu_precis, d.latitude, d.longitude
        FROM prestataires p
        LEFT JOIN prestataire_details d ON d.prestataire_id = p.id
        WHERE p.statut = 'publie'
        ORDER BY p.id ASC
    ";
    $lignes = $pdo->query($sql)->fetchAll();
    $details = [];
    foreach ($lignes as $ligne) {
        $details[(string) $ligne['prestataire_id']] = [
            'type_cuisine' => $ligne['type_cuisine'],
            'nom_chef' => $ligne['nom_chef'],
            'village_quartier' => $ligne['village_quartier'],
            'lieu_precis' => $ligne['lieu_precis'],
            'latitude' => $ligne['latitude'],
            'longitude' => $ligne['longitude'],
            'services' => []
        ];
    }

    $requeteServices = $pdo->query(
        "SELECT s.id, s.prestataire_id, s.type_service, s.categorie_service,
                s.titre, s.description, s.destination, s.lieu_depart,
                s.duree, s.prix_indicatif
         FROM prestataire_services s
         INNER JOIN prestataires p ON p.id = s.prestataire_id
         WHERE p.statut = 'publie' AND s.statut = 'publie'
         ORDER BY s.prestataire_id ASC, s.type_service ASC, s.titre ASC"
    );
    foreach ($requeteServices->fetchAll() as $service) {
        $cle = (string) $service['prestataire_id'];
        if (!isset($details[$cle])) continue;
        unset($service['prestataire_id']);
        $details[$cle]['services'][] = $service;
    }

    echo json_encode(['success' => true, 'data' => $details], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Impossible de charger les détails des prestataires.'
    ], JSON_UNESCAPED_UNICODE);
}
