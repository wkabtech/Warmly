const mysql = require('mysql2/promise');
const cron = require('node-cron');

// === Configuration MySQL ===
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'warmly'
};

// === Fonction pour nettoyer les tokens expirés ===
const cleanExpiredTokens = async () => {
  let connection;
  try {
    console.log("🗑️ Début du nettoyage des tokens expirés...");

    // Connexion à la base de données
    connection = await mysql.createConnection(MYSQL_CONFIG);

    // Requête pour supprimer les tokens expirés
    const [result] = await connection.execute(
      `DELETE FROM tokens WHERE exp < NOW()`
    );

    console.log(`✅ ${result.affectedRows} tokens expirés supprimés.`);
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage :", error.message);
  } finally {
    if (connection) await connection.end();
  }
};

// === Lancer immédiatement lors du démarrage ===
console.log("🚀 Script démarré, nettoyage immédiat...");
cleanExpiredTokens();

// === Planification avec node-cron ===
// ┌────────────── seconde (optionnel)
// │ ┌──────────── minute
// │ │ ┌────────── heure
// │ │ │ ┌──────── jour du mois
// │ │ │ │ ┌────── mois
// │ │ │ │ │ ┌──── jour de la semaine (0 - 7) (0 ou 7 = dimanche)
// │ │ │ │ │ │
// │ │ │ │ │ │
// * * * * * *
cron.schedule('0 0 * * 0', () => {
  console.log('⏳ Exécution de la tâche planifiée : nettoyage des tokens expirés.');
  cleanExpiredTokens();
});
