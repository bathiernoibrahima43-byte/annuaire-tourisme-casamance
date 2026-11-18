<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

try {
    $sql = "
        SELECT
            p.id,
            p.nom,
            p.region,
            p.ville,
            p.adresse,
            p.telephone,
            p.email,
            p.description,
            p.prix_indicatif,
            p.photo,
            d.type_cuisine,
            d.nom_chef,
            d.village_quartier,
            d.lieu_precis,
            d.latitude,
            d.longitude,
            c.nom AS categorie
        FROM prestataires p
        INNER JOIN categories c ON c.id = p.categorie_id
        LEFT JOIN prestataire_details d ON d.prestataire_id = p.id
        WHERE p.statut = 'publie'
        ORDER BY p.nom ASC
    ";

    $requete = $pdo->query($sql);
    $prestataires = $requete->fetchAll();

    echo json_encode(
        ['success' => true, 'data' => $prestataires],
        JSON_UNESCAPED_UNICODE
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'erreur' => 'Erreur lors de la lecture des prestataires.']);
}
