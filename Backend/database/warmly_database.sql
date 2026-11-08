-- ==============================================================================
-- BASE DE DONNÉES DU PROJET WARMLY
-- Reconstituée à partir du code source de l'API PHP et des scripts Node.js
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `warmly` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `warmly`;

-- ------------------------------------------------------------------------------
-- 1. Table: utilisateurs
-- Stocke les comptes utilisateurs avec authentification (mot de passe haché)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE `utilisateurs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nom` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: tokens (Sessions JWT)
-- Gère les tokens JWT actifs pour l'authentification mobile et la déconnexion
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT UNSIGNED NOT NULL,
  `token` TEXT NOT NULL,
  `exp` DATETIME NOT NULL,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tokens_user` (`utilisateur_id`),
  INDEX `idx_tokens_exp` (`exp`),
  CONSTRAINT `fk_tokens_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: pieces
-- Représente les pièces de la maison (ex: Salon, Chambre, etc.)
-- `mode_prog`: '1' si le planning automatique est activé sur cette pièce, '0' sinon
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `pieces`;
CREATE TABLE `pieces` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT UNSIGNED NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `mode_prog` ENUM('0', '1') DEFAULT '0',
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pieces_user` (`utilisateur_id`),
  CONSTRAINT `fk_pieces_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: radiateurs
-- Représente les modules ESP8266 installés sur les radiateurs
-- Modes possibles: 'confort', 'eco', 'hors-gel', 'arret', 'confort-1', 'confort-2'
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `radiateurs`;
CREATE TABLE `radiateurs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `piece_id` INT UNSIGNED NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `mode` VARCHAR(50) DEFAULT 'confort',
  `chip_id` VARCHAR(100) NULL,
  `token` VARCHAR(255) NULL,
  `date_ajout` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_radiateurs_piece` (`piece_id`),
  CONSTRAINT `fk_radiateurs_piece` FOREIGN KEY (`piece_id`) REFERENCES `pieces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: temperatures
-- Stocke les mesures de télémétrie relevées par les capteurs DHT des modules
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `temperatures`;
CREATE TABLE `temperatures` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `radiateur_id` INT UNSIGNED NOT NULL,
  `temperature` DECIMAL(5,2) NOT NULL,
  `humidite` DECIMAL(5,2) NOT NULL,
  `date_heure` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_temp_radiateur_date` (`radiateur_id`, `date_heure`),
  CONSTRAINT `fk_temp_radiateur` FOREIGN KEY (`radiateur_id`) REFERENCES `radiateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: consommations
-- Stocke les mesures de consommation électrique relevées par le capteur de courant (kWh)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `consommations`;
CREATE TABLE `consommations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `radiateur_id` INT UNSIGNED NOT NULL,
  `consommation_kwh` DECIMAL(10,4) NOT NULL,
  `date_heure` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_conso_radiateur_date` (`radiateur_id`, `date_heure`),
  CONSTRAINT `fk_conso_radiateur` FOREIGN KEY (`radiateur_id`) REFERENCES `radiateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: programmation
-- Stocke la planification hebdomadaire (créneaux horaires et modes associés)
-- Utilisée par pushScheduler.js pour appliquer les ordres fil pilote via MQTT
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `programmation`;
CREATE TABLE `programmation` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `piece_id` INT UNSIGNED NOT NULL,
  `date_heure` DATETIME NOT NULL,
  `mode` VARCHAR(50) NOT NULL,
  `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_prog_piece_date` (`piece_id`, `date_heure`),
  CONSTRAINT `fk_prog_piece` FOREIGN KEY (`piece_id`) REFERENCES `pieces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: fcm_tokens
-- Stocke les tokens Firebase Cloud Messaging par appareil physique (`device_id`)
-- Permet le multi-appareil sur un même compte utilisateur.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `fcm_tokens`;
CREATE TABLE `fcm_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `utilisateur_id` INT UNSIGNED NOT NULL,
  `device_id` VARCHAR(255) NOT NULL,
  `fcm_token` TEXT NOT NULL,
  `date_maj` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fcm_device` (`device_id`),
  UNIQUE KEY `uniq_device_user` (`utilisateur_id`, `device_id`),
  CONSTRAINT `fk_fcm_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table: preferences
-- Stocke les préférences de notification propres à chaque appareil (`device_id`).
-- Reliée directement à `fcm_tokens` via le `device_id`.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `preferences`;
CREATE TABLE `preferences` (
  `device_id` VARCHAR(255) NOT NULL,
  `temperature_notification` TINYINT(1) DEFAULT 1,
  `humidite_notification` TINYINT(1) DEFAULT 1,
  `mode_notification` TINYINT(1) DEFAULT 1,
  `date_maj` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  CONSTRAINT `fk_preferences_device` FOREIGN KEY (`device_id`) REFERENCES `fcm_tokens` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DONNÉES DE DÉMONSTRATION / TEST (SEED DATA)
-- ==============================================================================

-- 1. Utilisateur de test (Mot de passe en clair : "Warmly2025!" haché avec BCRYPT)
INSERT INTO `utilisateurs` (`id`, `nom`, `email`, `password`) VALUES
(1, 'demo', 'demo@warmly.fr', '$2y$10$wE1fA8yK3x9G0O5bV6v67eWk4q4TfJ5J3.r5f4F4N9dE7V2O2q9Gq');

-- 2. Pièces
INSERT INTO `pieces` (`id`, `utilisateur_id`, `nom`, `mode_prog`) VALUES
(1, 1, 'Salon', '1'),
(2, 1, 'Chambre Principale', '0'),
(3, 1, 'Bureau', '0');

-- 3. Radiateurs (ESP8266)
INSERT INTO `radiateurs` (`id`, `piece_id`, `nom`, `mode`, `chip_id`, `token`) VALUES
(1, 1, 'Radiateur Salon Sud', 'confort', 'ESP8266_5817120', 'token_rad_1'),
(2, 1, 'Radiateur Salon Nord', 'confort', 'ESP8266_5817121', 'token_rad_2'),
(3, 2, 'Radiateur Chambre', 'eco', 'ESP8266_5817122', 'token_rad_3'),
(4, 3, 'Radiateur Bureau', 'eco', 'ESP8266_5817123', 'token_rad_4');

-- 4. Télémétrie Température & Humidité récentes
INSERT INTO `temperatures` (`radiateur_id`, `temperature`, `humidite`, `date_heure`) VALUES
(1, 20.5, 48.0, NOW()),
(2, 20.2, 49.0, NOW()),
(3, 18.0, 52.0, NOW()),
(4, 19.0, 45.0, NOW());

-- 5. Mesures de consommation électrique (kWh)
INSERT INTO `consommations` (`radiateur_id`, `consommation_kwh`, `date_heure`) VALUES
(1, 0.450, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(1, 0.520, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 0.480, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 0.380, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 0.410, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 0.200, DATE_SUB(NOW(), INTERVAL 1 HOUR));
