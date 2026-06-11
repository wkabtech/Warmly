// pushScheduler.js

const mqtt = require('mqtt');
const mysql = require('mysql2/promise');
const { format } = require('date-fns');

// === CONFIGS ===
const MQTT_SERVER = 'mqtt://localhost';
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'warmly'
};

// === INIT MQTT ===
const client = mqtt.connect(MQTT_SERVER);

client.on('connect', () => {
  console.log('✅ Connecté au serveur MQTT');
});

client.on('error', (err) => {
  console.error('❌ Erreur MQTT :', err);
});

// === MEMORY ===
// 📦 Mémorisation des derniers modes envoyés
const lastSentModes = {}; 
// Format attendu : { "radiateur/12/44/55/mode": "eco", ... }

// === FONCTION PRINCIPALE ===
async function checkAndPushModes() {
  const now = new Date();
  const nowFormatted = format(now, 'yyyy-MM-dd HH:00:00');

  console.log(`\n⏰ Check programmation pour ${nowFormatted}`);

  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);

    const [programmedPieces] = await connection.execute(`
      SELECT DISTINCT p.id as piece_id, pr.mode
      FROM programmation pr
      JOIN pieces p ON pr.piece_id = p.id
      WHERE pr.date_heure = ? AND p.mode_prog = '1'
    `, [nowFormatted]);

    if (programmedPieces.length === 0) {
      console.log('Aucune programmation à cette heure.');
    } else {
      for (const piece of programmedPieces) {
        const pieceId = piece.piece_id;
        const mode = piece.mode;

        const [radiateurs] = await connection.execute(`
          SELECT id, utilisateur_id FROM radiateurs WHERE piece_id = ?
        `, [pieceId]);

        for (const radiateur of radiateurs) {
          const topic = `radiateur/${radiateur.utilisateur_id}/${pieceId}/${radiateur.id}/mode`;
          const message = mode;

          const previousMessage = lastSentModes[topic];

          if (previousMessage !== message) {
            console.log(`✉️ Nouveau mode détecté. Envoi [${message}] sur topic [${topic}]`);
            client.publish(topic, message);
            lastSentModes[topic] = message;
          } else {
            console.log(`⏩ Aucun changement pour ${topic}. Pas d'envoi.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Erreur MySQL :', err);
  } finally {
    if (connection) await connection.end();
  }

  await cleanOldProgrammations(); // ✅ Appel du nettoyage ici
}

// === CLEAN OLD PROGRAMMATIONS ===
async function cleanOldProgrammations() {
  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);

    const now = new Date();
    now.setMinutes(0, 0, 0); // ⏰ Met à l'heure pile précédente
    now.setHours(now.getHours() - 1); // ⬅️ Décale d'une heure en arrière

    const nowFormatted = format(now, 'yyyy-MM-dd HH:00:00');

    const [result] = await connection.execute(`
      DELETE FROM programmation
      WHERE date_heure <= ?
    `, [nowFormatted]);

    console.log(`🧹 Nettoyage effectué : ${result.affectedRows} anciennes programmations supprimées.`);
  } catch (err) {
    console.error('❌ Erreur pendant le nettoyage automatique :', err);
  } finally {
    if (connection) await connection.end();
  }
}

// === TIMER INTERVAL ===
setInterval(checkAndPushModes, 60000); // Toutes les 60 secondes

// Appel immédiat au lancement
checkAndPushModes();
