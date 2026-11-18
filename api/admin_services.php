<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();

function repondreServices(int $code, array $donnees): void
{
    http_response_code($code);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['administrateur'])) {
    repondreServices(401, [
        'success' => false,
        'erreur' => 'Connexion administrateur requise.'
    ]);
}

require_once __DIR__ . '/db.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $prestataireId = null;
        if (isset($_GET['prestataire_id']) && $_GET['prestataire_id'] !== '') {
            $prestataireId = filter_var($_GET['prestataire_id'], FILTER_VALIDATE_INT);
            if (!$prestataireId) {
                repondreServices(400, [
                    'success' => false,
                    'erreur' => 'Identifiant de prestataire invalide.'
                ]);
            }
        }

        $sql = "
            SELECT s.id, s.prestataire_id, s.type_service, s.categorie_service,
                   s.titre, s.description, s.destination, s.lieu_depart,
                   s.duree, s.prix_indicatif, s.statut,
                   p.nom AS nom_prestataire, c.nom AS categorie_prestataire
            FROM prestataire_services s
            INNER JOIN prestataires p ON p.id = s.prestataire_id
            INNER JOIN categories c ON c.id = p.categorie_id
        ";
        $parametres = [];
        if ($prestataireId) {
            $sql .= ' WHERE s.prestataire_id = :prestataire_id';
            $parametres['prestataire_id'] = $prestataireId;
        }
        $sql .= ' ORDER BY s.date_creation DESC, s.id DESC';
        $requete = $pdo->prepare($sql);
        $requete->execute($parametres);

        repondreServices(200, [
            'success' => true,
            'data' => $requete->fetchAll()
        ]);
    }

    $donnees = json_decode(file_get_contents('php://input'), true);
    if (!is_array($donnees)) {
        repondreServices(400, [
            'success' => false,
            'erreur' => 'Les données reçues sont invalides.'
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $id = isset($donnees['id']) && $donnees['id'] !== ''
            ? filter_var($donnees['id'], FILTER_VALIDATE_INT)
            : null;
        $prestataireId = filter_var($donnees['prestataire_id'] ?? null, FILTER_VALIDATE_INT);
        $typeService = $donnees['type_service'] ?? '';
        $categorieService = trim((string) ($donnees['categorie_service'] ?? ''));
        $titre = trim((string) ($donnees['titre'] ?? ''));
        $description = trim((string) ($donnees['description'] ?? ''));
        $destination = trim((string) ($donnees['destination'] ?? ''));
        $lieuDepart = trim((string) ($donnees['lieu_depart'] ?? ''));
        $duree = trim((string) ($donnees['duree'] ?? ''));
        $prixTexte = trim((string) ($donnees['prix_indicatif'] ?? ''));

        if (($donnees['id'] ?? '') !== '' && !$id) {
            repondreServices(400, ['success' => false, 'erreur' => 'Identifiant de prestation invalide.']);
        }
        if (!$prestataireId || !in_array($typeService, ['plat', 'offre'], true)
            || $titre === '' || strlen($titre) > 150 || strlen($categorieService) > 80
            || strlen($description) > 5000 || strlen($destination) > 180
            || strlen($lieuDepart) > 180 || strlen($duree) > 80) {
            repondreServices(400, [
                'success' => false,
                'erreur' => 'Vérifiez la catégorie, le nom et les longueurs des champs.'
            ]);
        }
        if ($prixTexte !== '' && (!is_numeric($prixTexte) || (float) $prixTexte < 0)) {
            repondreServices(400, [
                'success' => false,
                'erreur' => 'Le prix doit être un nombre positif ou laissé vide.'
            ]);
        }

        $prestataire = $pdo->prepare(
            'SELECT p.id, c.nom AS categorie
             FROM prestataires p
             INNER JOIN categories c ON c.id = p.categorie_id
             WHERE p.id = :id'
        );
        $prestataire->execute(['id' => $prestataireId]);
        $fiche = $prestataire->fetch();
        if (!$fiche) {
            repondreServices(404, ['success' => false, 'erreur' => 'Prestataire introuvable.']);
        }

        $categoriesAutorisees = $typeService === 'plat'
            ? ['Entrée', 'Plat principal', 'Dessert', 'Boisson', 'Spécialité']
            : ['Excursion', 'Circuit', 'Visite guidée', 'Transfert', 'Séjour organisé'];
        $categorieAttendue = $typeService === 'plat' ? 'Restaurant' : 'Agence de voyage';
        if ($fiche['categorie'] !== $categorieAttendue) {
            repondreServices(400, [
                'success' => false,
                'erreur' => $typeService === 'plat'
                    ? 'Les plats ne peuvent être associés qu’à une fiche Restaurant.'
                    : 'Les offres ne peuvent être associées qu’à une fiche Agence de voyage.'
            ]);
        }
        if (!in_array($categorieService, $categoriesAutorisees, true)) {
            repondreServices(400, [
                'success' => false,
                'erreur' => 'Choisissez une sous-catégorie proposée pour cette activité.'
            ]);
        }
        if ($typeService === 'offre' && ($destination === '' || $lieuDepart === '')) {
            repondreServices(400, [
                'success' => false,
                'erreur' => 'Pour une offre de voyage, précisez la destination et le lieu de départ.'
            ]);
        }

        $valeurs = [
            'prestataire_id' => $prestataireId,
            'type_service' => $typeService,
            'categorie_service' => $categorieService,
            'titre' => $titre,
            'description' => $description !== '' ? $description : null,
            'destination' => $destination !== '' ? $destination : null,
            'lieu_depart' => $lieuDepart !== '' ? $lieuDepart : null,
            'duree' => $duree !== '' ? $duree : null,
            'prix_indicatif' => $prixTexte !== '' ? $prixTexte : null
        ];

        if ($id) {
            $valeurs['id'] = $id;
            $requete = $pdo->prepare(
                "UPDATE prestataire_services
                 SET type_service = :type_service,
                     categorie_service = :categorie_service,
                     titre = :titre,
                     description = :description,
                     destination = :destination,
                     lieu_depart = :lieu_depart,
                     duree = :duree,
                     prix_indicatif = :prix_indicatif,
                     statut = 'publie'
                 WHERE id = :id AND prestataire_id = :prestataire_id"
            );
            $requete->execute($valeurs);
            if ($requete->rowCount() === 0) {
                $verification = $pdo->prepare(
                    'SELECT id FROM prestataire_services WHERE id = :id AND prestataire_id = :prestataire_id'
                );
                $verification->execute(['id' => $id, 'prestataire_id' => $prestataireId]);
                if (!$verification->fetch()) {
                    repondreServices(404, ['success' => false, 'erreur' => 'Prestation introuvable pour ce prestataire.']);
                }
            }
            repondreServices(200, ['success' => true, 'message' => 'La prestation a été modifiée et publiée.']);
        }

        $requete = $pdo->prepare(
            "INSERT INTO prestataire_services
                (prestataire_id, type_service, categorie_service, titre,
                 description, destination, lieu_depart, duree, prix_indicatif, statut)
             VALUES
                (:prestataire_id, :type_service, :categorie_service, :titre,
                 :description, :destination, :lieu_depart, :duree, :prix_indicatif, 'publie')"
        );
        $requete->execute($valeurs);
        repondreServices(201, ['success' => true, 'message' => 'La prestation a été ajoutée à la fiche.']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = filter_var($donnees['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) {
            repondreServices(400, ['success' => false, 'erreur' => 'Identifiant de prestation invalide.']);
        }
        $requete = $pdo->prepare(
            "UPDATE prestataire_services SET statut = 'archive' WHERE id = :id"
        );
        $requete->execute(['id' => $id]);
        if ($requete->rowCount() === 0) {
            $verification = $pdo->prepare('SELECT id FROM prestataire_services WHERE id = :id');
            $verification->execute(['id' => $id]);
            if (!$verification->fetch()) {
                repondreServices(404, ['success' => false, 'erreur' => 'Prestation introuvable.']);
            }
        }
        repondreServices(200, ['success' => true, 'message' => 'La prestation a été archivée.']);
    }

    repondreServices(405, ['success' => false, 'erreur' => 'Méthode non autorisée.']);
} catch (PDOException $e) {
    repondreServices(500, [
        'success' => false,
        'erreur' => 'Erreur lors de la gestion des plats et des offres.'
    ]);
}
