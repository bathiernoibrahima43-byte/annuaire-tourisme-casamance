USE annuaire_tourisme;

CREATE TABLE IF NOT EXISTS historique_reservations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    reservation_id INT NOT NULL,
    ancien_statut VARCHAR(30) NULL,
    nouveau_statut VARCHAR(30) NOT NULL,
    date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_historique_reservation_date (reservation_id, date_modification),
    INDEX idx_historique_date (date_modification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO historique_reservations (
    reservation_id,
    ancien_statut,
    nouveau_statut,
    date_modification
)
SELECT
    r.id,
    NULL,
    r.statut,
    r.date_creation
FROM reservations r
WHERE NOT EXISTS (
    SELECT 1
    FROM historique_reservations h
    WHERE h.reservation_id = r.id
      AND h.ancien_statut IS NULL
);
