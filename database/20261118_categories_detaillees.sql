-- Extension additive pour les catégories détaillées de l’annuaire.
-- À exécuter sur annuaire_tourisme après une sauvegarde de la base.
-- Ne supprime et ne modifie aucune table existante.
-- Les liens logiques vers prestataires.id sont vérifiés côté API afin de rester
-- compatibles avec le type exact de clé primaire du schéma local existant.

CREATE TABLE IF NOT EXISTS prestataire_details (
    prestataire_id INT NOT NULL,
    type_cuisine VARCHAR(120) NULL,
    nom_chef VARCHAR(150) NULL,
    village_quartier VARCHAR(160) NULL,
    lieu_precis VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (prestataire_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prestataire_services (
    id INT NOT NULL AUTO_INCREMENT,
    prestataire_id INT NOT NULL,
    type_service ENUM('plat', 'offre') NOT NULL,
    categorie_service VARCHAR(80) NOT NULL,
    titre VARCHAR(150) NOT NULL,
    description TEXT NULL,
    destination VARCHAR(180) NULL,
    lieu_depart VARCHAR(180) NULL,
    duree VARCHAR(80) NULL,
    prix_indicatif DECIMAL(10,2) NULL,
    statut ENUM('publie', 'archive') NOT NULL DEFAULT 'publie',
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_services_prestataire_statut (prestataire_id, statut),
    KEY idx_services_type_service (type_service)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
