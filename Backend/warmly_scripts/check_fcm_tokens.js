const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const serviceAccount = require('./warmly-firebase-adminsdk.json');

// === INITIALISATION DE FIREBASE ===
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// === CONFIG MYSQL ===
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'warmly'
};

// === ENVOYER UNE NOTIFICATION SILENCIEUSE ===
async function sendSilentNotification(token) {
  const message = {
    token: token,
    notification: {
      title: 'Vérification de présence',
      body: 'Notification silencieuse'
    },
    data: {
      silent: 'true'
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
        },
      },
    }
  };

  try {
    await admin.messaging().send(message);
    console.log(`✅ Notification silencieuse envoyée à ${token}`);
    return 'success';
  } catch (error) {
    console.error(`❌ Erreur d'envoi vers ${token} : ${error.message}`);
    if (error.code === 'messaging/registration-token-not-registered') {
      return 'NotRegistered';
    }
    return 'network_error';
  }
}

// === VÉRIFIER ET NETTOYER LES TOKENS ===
async function checkAndCleanTokens() {
  let connection;
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    const [rows] = await connection.execute('SELECT id, fcm_token FROM fcm_tokens');

    for (const row of rows) {
      const { id, fcm_token } = row;
      const result = await sendSilentNotification(fcm_token);

      if (result === 'NotRegistered') {
        console.log(`🗑️ Suppression de l'appareil avec FCM token : ${fcm_token}`);
        await connection.execute('DELETE FROM fcm_tokens WHERE id = ?', [id]);
      }
    }
  } catch (err) {
    console.error('❌ Erreur MySQL :', err);
  } finally {
    if (connection) await connection.end();
  }
}

// === PLANIFICATION MENSUELLE ===
setInterval(() => {
  const now = new Date();
  if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
    console.log('🗓️ Vérification mensuelle des FCM tokens');
    checkAndCleanTokens();
  }
}, 60000); // Vérification chaque minute pour déclencher le 1er du mois à minuit

// Lancer immédiatement pour tester
checkAndCleanTokens();
