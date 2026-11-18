<?php

header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'erreur' => 'Méthode non autorisée.']);
    exit;
}

$donnees = json_decode(file_get_contents('php://input'), true);
$email = trim($donnees['email'] ?? '');
$motDePasse = $donnees['mot_de_passe'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $motDePasse === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'erreur' => 'Saisissez votre e-mail et votre mot de passe.']);
    exit;
}

try {
    $requete = $pdo->prepare(
        'SELECT id, nom, email, mot_de_passe
         FROM administrateurs
         WHERE email = :email
         LIMIT 1'
    );
    $requete->execute(['email' => $email]);
    $administrateur = $requete->fetch();

    if (!$administrateur || !password_verify($motDePasse, $administrateur['mot_de_passe'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'erreur' => 'E-mail ou mot de passe incorrect.']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['administrateur'] = [
        'id' => (int) $administrateur['id'],
        'nom' => $administrateur['nom'],
        'email' => $administrateur['email'],
    ];

    echo json_encode([
        'success' => true,
        'administrateur' => $_SESSION['administrateur'],
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'erreur' => 'Erreur lors de la connexion.']);
}
