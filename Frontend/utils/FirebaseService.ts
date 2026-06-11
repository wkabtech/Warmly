// 🔥 utils/FirebaseService.ts
import messaging from '@react-native-firebase/messaging';
import firebase from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// 🔥 Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAUbFttsZhOyFZGVSN09ljDH86zw0ld2t4",
  authDomain: "warmly-a9c46.firebaseapp.com",
  projectId: "warmly-a9c46",
  storageBucket: "warmly-a9c46.appspot.com",
  messagingSenderId: "526769789623",
  appId: "1:526769789623:android:acf3cfaef156aba8568b32"
};

// ✅ Initialisation complète directement dans initializeFirebase
export const initializeFirebase = async () => {
  console.log("🔥 Initialisation des services Firebase...");

  // 🔥 Initialisation de Firebase (modulaire)
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      console.log("🔥 Firebase initialisé avec succès via @react-native-firebase/app.");
    } catch (error) {
      console.error("❌ Erreur d'initialisation de Firebase :", error.message);
      return;
    }
  } else {
    console.log("✅ Firebase déjà initialisé.");
  }

  try {
    // 🔥 Demande l'autorisation d'utiliser les notifications
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Autorisation de notifications accordée.');
      await getFcmToken();
    } else {
      console.log('🚫 Autorisation de notifications refusée.');
    }

    // 📲 Écoute les messages en arrière-plan
    messaging().onMessage(async (remoteMessage) => {
      console.log('📲 Notification reçue en arrière-plan :', remoteMessage);
    });

    // ✅ Gestion Android background
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📲 Notification en background (Android) :', remoteMessage);
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase :', error.message);
  }
};

export const getFcmToken = async () => {
  try {
    let fcmToken = await AsyncStorage.getItem('fcmToken');
    if (!fcmToken) {
      fcmToken = await messaging().getToken();
    }

    if (fcmToken) {
      console.log('✅ Token FCM récupéré :', fcmToken);

      await AsyncStorage.setItem('fcmToken', fcmToken);

      // 🔴 ENVOI AU SERVEUR PHP 🔴
      const utilisateur_id = await AsyncStorage.getItem('user_id');
      const device_id = `${utilisateur_id}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', device_id);

      console.log('📝 Données envoyées à PHP :', {
        utilisateur_id,
        device_id,
        fcm_token: fcmToken,
      });

const data = new URLSearchParams();
data.append('utilisateur_id', utilisateur_id);
data.append('device_id', device_id);
data.append('fcm_token', fcmToken);

await api.post('enregistrer_appareil.php', data)
  .then((response) => {
    console.log('✅ Enregistrement de l\'appareil réussi sur le serveur.', response.data);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'envoi au serveur :', error.message);
    if (error.response) {
      console.error('❌ Réponse du serveur :', error.response.data);
    }
  });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du FCM Token:', error.message);
  }
};
