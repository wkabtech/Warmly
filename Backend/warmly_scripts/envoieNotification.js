// === Modules requis ===
const mqtt = require('mqtt');
const mysql = require('mysql2/promise');
const admin = require("firebase-admin");
const serviceAccount = require("./warmly-firebase-adminsdk.json");

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
  
  client.subscribe('radiateur/+/+/+/mode', (err) => {
    if (err) {
      console.error('❌ Erreur de souscription (mode) :', err.message);
    } else {
      console.log('📡 Souscrit au topic : radiateur/+/+/+/mode');
    }
  });

  client.subscribe('radiateur/+/+/+/temperature', (err) => {
    if (err) {
      console.error('❌ Erreur de souscription (température) :', err.message);
    } else {
      console.log('📡 Souscrit au topic : radiateur/+/+/+/temperature');
    }
  });

  client.subscribe('radiateur/+/+/+/humidite', (err) => {
    if (err) {
      console.error('❌ Erreur de souscription (humidité) :', err.message);
    } else {
      console.log('📡 Souscrit au topic : radiateur/+/+/+/humidite');
    }
  });
});

// 🔥 Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// === Écouter les messages MQTT ===
client.on('message', async (topic, message) => {
  const [_, utilisateur_id, piece_id, radiateur_id, type] = topic.split('/');

  console.log(`📥 Message reçu sur [${topic}] : ${message.toString()}`);

  let connection;
  try {
    // 🔄 Connexion MySQL
    connection = await mysql.createConnection(MYSQL_CONFIG);

    // 🔎 Récupérer les noms du radiateur et de la pièce
    const [rows] = await connection.execute(`
      SELECT r.nom AS radiateur_nom, p.nom AS piece_nom 
      FROM radiateurs r 
      JOIN pieces p ON r.piece_id = p.id 
      WHERE r.id = ?
    `, [radiateur_id]);

    if (rows.length === 0) {
      console.log("⚠️ Radiateur ou pièce non trouvé.");
      return;
    }

    const nomRadiateur = rows[0].radiateur_nom;
    const nomPiece = rows[0].piece_nom;

    // 🔎 Récupérer les `device_id` de l'utilisateur
    const [devices] = await connection.execute(`
      SELECT device_id, fcm_token FROM fcm_tokens WHERE utilisateur_id = ?
    `, [utilisateur_id]);

    if (devices.length === 0) {
      console.log("⚠️ Aucun appareil trouvé pour cet utilisateur.");
      return;
    }

    // === Construction du message en fonction du type ===
    let notificationMessage = {};

    if (type === 'mode') {
      notificationMessage = {
        notification: {
          title: `Changement de Mode`,
          body: `Le radiateur "${nomRadiateur}" dans la pièce "${nomPiece}" est passé en mode "${message.toString().toUpperCase()}"`
        }
      };
    } 
    else if (type === 'temperature') {
      const data = JSON.parse(message);

      notificationMessage = {
        notification: {
          title: `Changement de Température`,
          body: `La température de "${nomRadiateur}" dans "${nomPiece}" est maintenant de ${data.valeur}°C`
        }
      };
    } 
    else if (type === 'humidite') {
      const data = JSON.parse(message);

      notificationMessage = {
        notification: {
          title: `Changement d'Humidité`,
          body: `L'humidité de "${nomRadiateur}" dans "${nomPiece}" est maintenant de ${data.valeur}%`
        }
      };
    }

    // 📡 Envoi de la notification à chaque appareil trouvé
    await Promise.all(
      devices.map(async (device) => {
        // 🔄 Vérification des préférences avant envoi
        const [preferences] = await connection.execute(`
          SELECT ${type}_notification as active FROM preferences WHERE device_id = ?
        `, [device.device_id]);

        if (preferences.length > 0 && preferences[0].active === 1) {
          await admin.messaging().send({ ...notificationMessage, token: device.fcm_token });
          console.log(`✅ Notification envoyée à l'appareil (${device.device_id})`);
        } else {
          console.log(`⚠️ Notification non envoyée : les préférences sont désactivées pour ce type (${type}) sur l'appareil (${device.device_id})`);
        }
      })
    );

  } catch (error) {
    console.error('❌ Erreur MySQL ou Firebase :', error.message);
  } finally {
    if (connection) await connection.end();
  }
});
