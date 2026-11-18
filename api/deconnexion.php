<?php

header('Content-Type: application/json; charset=utf-8');
session_start();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $parametres = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $parametres['path'],
        $parametres['domain'],
        $parametres['secure'],
        $parametres['httponly']
    );
}

session_destroy();

echo json_encode([
    'success' => true,
    'message' => 'Vous êtes déconnecté.',
], JSON_UNESCAPED_UNICODE);
