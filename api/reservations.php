<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'erreur' => 'Cette adresse accepte uniquement les demandes de réservation.'
    ]);
    exit;
}

$donnees = json_decode(file_get_contents('php://input'), true);

if (!is_array($donnees)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'erreur' => 'Les données reçues sont invalides.']);
    exit;
}

$prestataireId = filter_var($donnees['prestataire_id'] ?? null, FILTER_VALIDATE_INT);
$nom = trim($donnees['nom_client'] ?? '');
$email = trim($donnees['email_client'] ?? '');
$telephone = trim($donnees['telephone_client'] ?? '');
$dateDebut = trim($donnees['date_debut'] ?? '');
$dateFin = trim($donnees['date_fin'] ?? '');
$personnes = filter_var($donnees['nombre_personnes'] ?? 1, FILTER_VALIDATE_INT);
$message = trim($donnees['message'] ?? '');

$dateDebutValide = preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateDebut)
    && checkdate((int) substr($dateDebut, 5, 2), (int) substr($dateDebut, 8, 2), (int) substr($dateDebut, 0, 4));

$dateFinValide = preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFin)
    && checkdate((int) substr($dateFin, 5, 2), (int) substr($dateFin, 8, 2), (int) substr($dateFin, 0, 4));

if (!$prestataireId || $nom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || !$personnes || $personnes < 1 || !$dateDebutValide || !$dateFinValide) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'erreur' => 'Vérifiez le nom, l’adresse e-mail, les dates et le nombre de personnes.'
    ]);
    exit;
}

if ($dateFin < $dateDebut) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'erreur' => 'La date de fin doit être égale ou postérieure à la date de début.'
    ]);
    exit;
}

try {
    $verification = $pdo->prepare(
        "SELECT id FROM prestataires WHERE id = :id AND statut = 'publie'"
    );
    $verification->execute(['id' => $prestataireId]);

    if (!$verification->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'erreur' => 'Prestataire introuvable.']);
        exit;
    }

    $requete = $pdo->prepare(
        "INSERT INTO reservations
            (prestataire_id, nom_client, email_client, telephone_client,
             date_debut, date_fin, nombre_personnes, message)
         VALUES
            (:prestataire_id, :nom_client, :email_client, :telephone_client,
             :date_debut, :date_fin, :nombre_personnes, :message)"
    );

    $requete->execute([
        'prestataire_id' => $prestataireId,
        'nom_client' => $nom,
        'email_client' => $email,
        'telephone_client' => $telephone !== '' ? $telephone : null,
        'date_debut' => $dateDebut,
        'date_fin' => $dateFin,
        'nombre_personnes' => $personnes,
        'message' => $message !== '' ? $message : null,
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Votre demande a été enregistrée. Elle est en attente de confirmation.',
        'reservation_id' => (int) $pdo->lastInsertId()
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'erreur' => 'Une erreur est survenue lors de l’enregistrement.'
    ]);
}
