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
                d.id,
                d.prestataire_id,
                d.date_disponibilite,
                d.est_disponible,
                p.nom AS nom_prestataire
            FROM disponibilites d
            INNER JOIN prestataires p ON p.id = d.prestataire_id
            ORDER BY d.date_disponibilite ASC
        ";

        echo json_encode([
            'success' => true,
            'data' => $pdo->query($sql)->fetchAll()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $donnees = json_decode(file_get_contents('php://input'), true);

    if (!is_array($donnees)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'erreur' => 'Les données reçues sont invalides.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $prestataireId = filter_var(
            $donnees['prestataire_id'] ?? null,
            FILTER_VALIDATE_INT
        );
        $date = $donnees['date_disponibilite'] ?? '';

        $dateValide = is_string($date)
            && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            && checkdate(
                (int) substr($date, 5, 2),
                (int) substr($date, 8, 2),
                (int) substr($date, 0, 4)
            );

        if (!$prestataireId || !$dateValide || $date < date('Y-m-d')) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'erreur' => 'Choisissez un prestataire et une date valide, aujourd’hui ou ultérieure.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $requete = $pdo->prepare(
            "SELECT id FROM prestataires
             WHERE id = :id AND statut = 'publie'"
        );
        $requete->execute(['id' => $prestataireId]);

        if (!$requete->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'erreur' => 'Prestataire introuvable.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $insertion = $pdo->prepare(
            "INSERT INTO disponibilites
                (prestataire_id, date_disponibilite, est_disponible)
             VALUES (:prestataire_id, :date_disponibilite, 1)
             ON DUPLICATE KEY UPDATE est_disponible = 1"
        );
        $insertion->execute([
            'prestataire_id' => $prestataireId,
            'date_disponibilite' => $date
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'La disponibilité a été enregistrée.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = filter_var($donnees['id'] ?? null, FILTER_VALIDATE_INT);

        if (!$id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'erreur' => 'Identifiant de disponibilité invalide.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $suppression = $pdo->prepare(
            'DELETE FROM disponibilites WHERE id = :id'
        );
        $suppression->execute(['id' => $id]);

        echo json_encode([
            'success' => true,
            'message' => 'La disponibilité a été supprimée.'
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
        'erreur' => 'Erreur lors de la gestion des disponibilités.'
    ], JSON_UNESCAPED_UNICODE);
}
