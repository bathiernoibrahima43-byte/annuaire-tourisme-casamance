<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();

if (!isset($_SESSION['administrateur'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'erreur' => 'Connexion administrateur requise.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $sql = "
            SELECT
                a.id,
                a.nom_auteur,
                a.note,
                a.commentaire,
                a.statut,
                a.date_creation,
                p.nom AS nom_prestataire
            FROM avis a
            INNER JOIN prestataires p ON p.id = a.prestataire_id
            ORDER BY a.date_creation DESC
        ";

        echo json_encode([
            'success' => true,
            'data' => $pdo->query($sql)->fetchAll()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $donnees = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($donnees['id'] ?? null, FILTER_VALIDATE_INT);
        $statut = $donnees['statut'] ?? '';

        if (!$id || !in_array($statut, ['publie', 'rejete'], true)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'erreur' => 'Identifiant ou statut invalide.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $requete = $pdo->prepare(
            'UPDATE avis SET statut = :statut WHERE id = :id'
        );
        $requete->execute(['statut' => $statut, 'id' => $id]);

        echo json_encode([
            'success' => true,
            'message' => 'Le statut de l’avis a été mis à jour.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode([
        'success' => false,
        'erreur' => 'Méthode non autorisée.'
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Erreur lors de la gestion des avis.'
    ], JSON_UNESCAPED_UNICODE);
}
