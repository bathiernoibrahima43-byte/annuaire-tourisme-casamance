<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
            "SELECT nom_auteur, note, commentaire, date_creation
             FROM avis
             WHERE prestataire_id = :prestataire_id
               AND statut = 'publie'
             ORDER BY date_creation DESC"
        );
        $requete->execute(['prestataire_id' => $prestataireId]);
        $avis = $requete->fetchAll();

        $moyenne = null;
        if (count($avis) > 0) {
            $moyenne = round(
                array_sum(array_column($avis, 'note')) / count($avis),
                1
            );
        }

        echo json_encode([
            'success' => true,
            'data' => $avis,
            'moyenne' => $moyenne,
            'nombre' => count($avis)
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'erreur' => 'Impossible de charger les avis.'
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'erreur' => 'Méthode non autorisée.'
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

$prestataireId = filter_var(
    $donnees['prestataire_id'] ?? null,
    FILTER_VALIDATE_INT
);
$nom = trim($donnees['nom_auteur'] ?? '');
$note = filter_var($donnees['note'] ?? null, FILTER_VALIDATE_INT);
$commentaire = trim($donnees['commentaire'] ?? '');

if (
    !$prestataireId ||
    $nom === '' ||
    strlen($nom) > 150 ||
    !$note ||
    $note < 1 ||
    $note > 5 ||
    strlen($commentaire) > 2000
) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'erreur' => 'Vérifiez le nom, la note (de 1 à 5) et la longueur du commentaire.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $verification = $pdo->prepare(
        "SELECT id FROM prestataires
         WHERE id = :id AND statut = 'publie'"
    );
    $verification->execute(['id' => $prestataireId]);

    if (!$verification->fetch()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'erreur' => 'Prestataire introuvable.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $insertion = $pdo->prepare(
        "INSERT INTO avis
            (prestataire_id, nom_auteur, note, commentaire, statut)
         VALUES
            (:prestataire_id, :nom_auteur, :note, :commentaire, 'en_attente')"
    );

    $insertion->execute([
        'prestataire_id' => $prestataireId,
        'nom_auteur' => $nom,
        'note' => $note,
        'commentaire' => $commentaire !== '' ? $commentaire : null
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Votre avis a été envoyé et attend la validation de l’administrateur.'
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Une erreur est survenue lors de l’enregistrement de l’avis.'
    ], JSON_UNESCAPED_UNICODE);
}
