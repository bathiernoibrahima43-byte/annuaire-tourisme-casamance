<?php

header('Content-Type: application/json; charset=utf-8');
session_start();

if (isset($_SESSION['administrateur'])) {
    echo json_encode([
        'success' => true,
        'connecte' => true,
        'administrateur' => $_SESSION['administrateur'],
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'success' => true,
        'connecte' => false,
    ]);
}
