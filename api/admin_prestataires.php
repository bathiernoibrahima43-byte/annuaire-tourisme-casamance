<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();

function repondre($code, $donnees)
{
    http_response_code($code);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
    exit;
}

function enregistrerDetailsPrestataire($pdo, $prestataireId, $details)
{
    $requete = $pdo->prepare(
        'INSERT INTO prestataire_details
            (prestataire_id, type_cuisine, nom_chef, village_quartier,
             lieu_precis, latitude, longitude)
         VALUES
            (:prestataire_id, :type_cuisine, :nom_chef, :village_quartier,
             :lieu_precis, :latitude, :longitude)
         ON DUPLICATE KEY UPDATE
            type_cuisine = VALUES(type_cuisine),
            nom_chef = VALUES(nom_chef),
            village_quartier = VALUES(village_quartier),
            lieu_precis = VALUES(lieu_precis),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude)'
    );
    $requete->execute(array_merge(['prestataire_id' => $prestataireId], $details));
}

if (!isset($_SESSION['administrateur'])) {
    repondre(401, [
        'success' => false,
        'erreur' => 'Connexion administrateur requise.'
    ]);
}

require_once __DIR__ . '/db.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $prestataires = $pdo->query(
            "SELECT
                p.id,
                p.categorie_id,
                p.nom,
                p.region,
                p.ville,
                p.adresse,
                p.telephone,
                p.email,
                p.description,
                p.prix_indicatif,
                p.statut,
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
             ORDER BY p.nom ASC"
        )->fetchAll();

        $categories = $pdo->query(
            'SELECT id, nom FROM categories ORDER BY nom ASC'
        )->fetchAll();

        repondre(200, [
            'success' => true,
            'prestataires' => $prestataires,
            'categories' => $categories
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $donnees = json_decode(file_get_contents('php://input'), true);

        if (!is_array($donnees)) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Les données reçues sont invalides.'
            ]);
        }

        $id = isset($donnees['id'])
            ? filter_var($donnees['id'], FILTER_VALIDATE_INT)
            : null;

        $categorieId = filter_var(
            $donnees['categorie_id'] ?? null,
            FILTER_VALIDATE_INT
        );

        $nom = trim($donnees['nom'] ?? '');
        $region = trim($donnees['region'] ?? '');
        $ville = trim($donnees['ville'] ?? '');
        $adresse = trim($donnees['adresse'] ?? '');
        $telephone = trim($donnees['telephone'] ?? '');
        $email = trim($donnees['email'] ?? '');
        $description = trim($donnees['description'] ?? '');
        $statut = $donnees['statut'] ?? 'publie';
        $prixTexte = trim((string) ($donnees['prix_indicatif'] ?? ''));
        $typeCuisine = trim((string) ($donnees['type_cuisine'] ?? ''));
        $nomChef = trim((string) ($donnees['nom_chef'] ?? ''));
        $villageQuartier = trim((string) ($donnees['village_quartier'] ?? ''));
        $lieuPrecis = trim((string) ($donnees['lieu_precis'] ?? ''));
        $latitudeTexte = trim((string) ($donnees['latitude'] ?? ''));
        $longitudeTexte = trim((string) ($donnees['longitude'] ?? ''));

        if (isset($donnees['id']) && !$id) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Identifiant de prestataire invalide.'
            ]);
        }

        if (
            !$categorieId ||
            $nom === '' ||
            $region === '' ||
            $ville === '' ||
            strlen($nom) > 150 ||
            strlen($region) > 100 ||
            strlen($ville) > 100 ||
            strlen($typeCuisine) > 120 ||
            strlen($nomChef) > 150 ||
            strlen($villageQuartier) > 160 ||
            strlen($lieuPrecis) > 255 ||
            !in_array($statut, ['en_attente', 'publie', 'archive'], true)
        ) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Vérifiez la catégorie, le nom, la région, la ville et le statut.'
            ]);
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            repondre(400, [
                'success' => false,
                'erreur' => 'L’adresse e-mail n’est pas valide.'
            ]);
        }

        if ($prixTexte !== '' && (!is_numeric($prixTexte) || (float) $prixTexte < 0)) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Le prix doit être un nombre positif ou laissé vide.'
            ]);
        }

        $coordonneesFournies = $latitudeTexte !== '' || $longitudeTexte !== '';
        if (
            $coordonneesFournies &&
            ($latitudeTexte === '' || $longitudeTexte === '' ||
             !is_numeric($latitudeTexte) || !is_numeric($longitudeTexte) ||
             (float) $latitudeTexte < -90 || (float) $latitudeTexte > 90 ||
             (float) $longitudeTexte < -180 || (float) $longitudeTexte > 180)
        ) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Saisissez les deux coordonnées GPS dans leurs plages valides, ou laissez-les vides.'
            ]);
        }

        $verificationCategorie = $pdo->prepare(
            'SELECT id, nom FROM categories WHERE id = :id'
        );
        $verificationCategorie->execute(['id' => $categorieId]);
        $categorie = $verificationCategorie->fetch();

        if (!$categorie) {
            repondre(400, [
                'success' => false,
                'erreur' => 'La catégorie sélectionnée est introuvable.'
            ]);
        }

        if ($categorie['nom'] !== 'Restaurant') {
            $typeCuisine = '';
            $nomChef = '';
        }

        $details = [
            'type_cuisine' => $typeCuisine !== '' ? $typeCuisine : null,
            'nom_chef' => $nomChef !== '' ? $nomChef : null,
            'village_quartier' => $villageQuartier !== '' ? $villageQuartier : null,
            'lieu_precis' => $lieuPrecis !== '' ? $lieuPrecis : null,
            'latitude' => $latitudeTexte !== '' ? (float) $latitudeTexte : null,
            'longitude' => $longitudeTexte !== '' ? (float) $longitudeTexte : null
        ];

        $valeurs = [
            'categorie_id' => $categorieId,
            'nom' => $nom,
            'region' => $region,
            'ville' => $ville,
            'adresse' => $adresse !== '' ? $adresse : null,
            'telephone' => $telephone !== '' ? $telephone : null,
            'email' => $email !== '' ? $email : null,
            'description' => $description !== '' ? $description : null,
            'prix_indicatif' => $prixTexte !== '' ? $prixTexte : null,
            'statut' => $statut
        ];

        if ($id) {
            $valeurs['id'] = $id;
            $pdo->beginTransaction();

            $requete = $pdo->prepare(
                'UPDATE prestataires
                 SET categorie_id = :categorie_id,
                     nom = :nom,
                     region = :region,
                     ville = :ville,
                     adresse = :adresse,
                     telephone = :telephone,
                     email = :email,
                     description = :description,
                     prix_indicatif = :prix_indicatif,
                     statut = :statut
                 WHERE id = :id'
            );
            $requete->execute($valeurs);
            $verifierPrestataire = $pdo->prepare('SELECT id FROM prestataires WHERE id = :id');
            $verifierPrestataire->execute(['id' => $id]);
            if (!$verifierPrestataire->fetch()) {
                $pdo->rollBack();
                repondre(404, ['success' => false, 'erreur' => 'Prestataire introuvable.']);
            }
            enregistrerDetailsPrestataire($pdo, $id, $details);
            $pdo->commit();

            repondre(200, [
                'success' => true,
                'message' => 'La fiche du prestataire a été modifiée.'
            ]);
        }

        $pdo->beginTransaction();
        $requete = $pdo->prepare(
            'INSERT INTO prestataires
                (categorie_id, nom, region, ville, adresse, telephone,
                 email, description, prix_indicatif, statut)
             VALUES
                (:categorie_id, :nom, :region, :ville, :adresse, :telephone,
                 :email, :description, :prix_indicatif, :statut)'
        );
        $requete->execute($valeurs);
        $nouvelId = (int) $pdo->lastInsertId();
        if ($nouvelId < 1) {
            $pdo->rollBack();
            repondre(500, ['success' => false, 'erreur' => 'Impossible de récupérer la fiche créée.']);
        }
        enregistrerDetailsPrestataire($pdo, $nouvelId, $details);
        $pdo->commit();

        repondre(201, [
            'success' => true,
            'message' => 'Le prestataire a été ajouté à l’annuaire.'
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $donnees = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($donnees['id'] ?? null, FILTER_VALIDATE_INT);

        if (!$id) {
            repondre(400, [
                'success' => false,
                'erreur' => 'Identifiant de prestataire invalide.'
            ]);
        }

        $requete = $pdo->prepare(
            "UPDATE prestataires SET statut = 'archive' WHERE id = :id"
        );
        $requete->execute(['id' => $id]);

        if ($requete->rowCount() === 0) {
            $verifier = $pdo->prepare(
                'SELECT id FROM prestataires WHERE id = :id'
            );
            $verifier->execute(['id' => $id]);

            if (!$verifier->fetch()) {
                repondre(404, [
                    'success' => false,
                    'erreur' => 'Prestataire introuvable.'
                ]);
            }
        }

        repondre(200, [
            'success' => true,
            'message' => 'Le prestataire a été archivé.'
        ]);
    }

    repondre(405, [
        'success' => false,
        'erreur' => 'Méthode non autorisée.'
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    repondre(500, [
        'success' => false,
        'erreur' => 'Erreur lors de la gestion des prestataires.'
    ]);
}
