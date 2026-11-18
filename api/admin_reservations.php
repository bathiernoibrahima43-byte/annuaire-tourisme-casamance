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
                r.id,
                r.nom_client,
                r.email_client,
                r.telephone_client,
                r.date_debut,
                r.date_fin,
                r.nombre_personnes,
                r.message,
                r.statut,
                r.date_creation,
                p.nom AS nom_prestataire
            FROM reservations r
            INNER JOIN prestataires p ON p.id = r.prestataire_id
            ORDER BY r.date_creation DESC
        ";
        $reservations = $pdo->query($sql)->fetchAll();

        $sqlHistorique = "
            SELECT
                h.id,
                h.reservation_id,
                h.ancien_statut,
                h.nouveau_statut,
                h.date_modification,
                r.nom_client,
                r.email_client,
                r.date_debut,
                r.date_fin,
                r.nombre_personnes,
                p.nom AS nom_prestataire
            FROM historique_reservations h
            INNER JOIN reservations r ON r.id = h.reservation_id
            INNER JOIN prestataires p ON p.id = r.prestataire_id
            ORDER BY h.date_modification DESC, h.id DESC
        ";
        $historique = $pdo->query($sqlHistorique)->fetchAll();

        echo json_encode([
            'success' => true,
            'data' => $reservations,
            'historique' => $historique
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $donnees = json_decode(file_get_contents('php://input'), true);
        if (!is_array($donnees)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'erreur' => 'Données JSON invalides.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $id = filter_var($donnees['id'] ?? null, FILTER_VALIDATE_INT);
        $statut = $donnees['statut'] ?? '';
        $statutsAutorises = ['en_attente', 'confirmee', 'annulee'];

        if (!$id || !in_array($statut, $statutsAutorises, true)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'erreur' => 'Identifiant ou statut invalide.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();

        $verifier = $pdo->prepare(
            'SELECT statut FROM reservations WHERE id = :id FOR UPDATE'
        );
        $verifier->execute(['id' => $id]);
        $reservation = $verifier->fetch();

        if (!$reservation) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'erreur' => 'Réservation introuvable.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $ancienStatut = $reservation['statut'];

        if ($ancienStatut === $statut) {
            $pdo->commit();
            echo json_encode([
                'success' => true,
                'message' => 'La réservation avait déjà ce statut ; aucun nouveau changement n’a été ajouté à l’historique.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $miseAJour = $pdo->prepare(
            'UPDATE reservations SET statut = :statut WHERE id = :id'
        );
        $miseAJour->execute([
            'statut' => $statut,
            'id' => $id,
        ]);

        $journal = $pdo->prepare(
            'INSERT INTO historique_reservations (reservation_id, ancien_statut, nouveau_statut) VALUES (:reservation_id, :ancien_statut, :nouveau_statut)'
        );
        $journal->execute([
            'reservation_id' => $id,
            'ancien_statut' => $ancienStatut,
            'nouveau_statut' => $statut,
        ]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Le statut de la réservation a été mis à jour et ajouté à l’historique.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode([
        'success' => false,
        'erreur' => 'Méthode non autorisée.'
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Erreur lors de la gestion des réservations.'
    ], JSON_UNESCAPED_UNICODE);
}
