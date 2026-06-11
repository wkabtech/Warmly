import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { BASE_URL } from '../utils/api';
import { updateTokenToESP } from '../utils/tokenSync';
import { initializeFirebase } from '../utils/FirebaseService';

interface AuthContextType {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    checkToken();
  }, []);

  // 📝 Nouvelle méthode pour initialiser les préférences
const initializePreferences = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const deviceId = await AsyncStorage.getItem('device_id');

    console.log("🔍 Vérification des valeurs récupérées depuis AsyncStorage:");
    console.log("🔹 Token :", token);
    console.log("🔹 Device ID :", deviceId);

    if (!deviceId || deviceId === 'null' || deviceId.trim() === '') {
      console.warn("⚠️ Device ID manquant ou invalide. Abandon de l'initialisation.");
      return;
    }

    if (!token) {
      console.warn("⚠️ Token manquant. Abandon de l'initialisation.");
      return;
    }

    console.log("📝 Envoi de l'initialisation des préférences pour le device_id :", deviceId);

    // ✅ Construction de l'objet URLSearchParams pour x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('device_id', deviceId);
    params.append('init', "true");

    // ✅ Requête POST avec Axios
    const response = await api.post('preferences.php', params);

    // 🔎 Vérification du contenu brut de la réponse
    console.log("📩 Réponse brute de l'API :", response.data);

    if (response.data && response.data.success) {
      console.log("✅ Préférences initialisées pour le device_id :", deviceId);
    } else {
      console.warn(`⚠️ Problème lors de l'initialisation : ${response.data.message}`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation des préférences :", error.message);
  }
};






  const signIn = async (username: string, password: string) => {
    try {
      await AsyncStorage.multiRemove(['token', 'user_id', 'username', 'email', 'fcmToken']);

      const response = await api.post(
        'connexion.php',
        JSON.stringify({ username, password }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { token, utilisateur_id, nom, email } = response.data;

      if (token && utilisateur_id) {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user_id', utilisateur_id.toString());
        if (nom) await AsyncStorage.setItem('username', nom);
        if (email) await AsyncStorage.setItem('email', email);

        console.log('✅ Connexion réussie');
        setIsAuthenticated(true);

        await updateTokenToESP();

        let deviceId = await AsyncStorage.getItem('device_id');

        if (!deviceId || deviceId === 'null' || deviceId.trim() === '') {
          await initializeFirebase();
          deviceId = await AsyncStorage.getItem('device_id');
        } else {
          console.log("✅ Device ID déjà existant, pas de régénération :", deviceId);
        }

        await initializePreferences();
        return true;
      } else {
        console.warn('❌ Données manquantes dans la réponse');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la connexion :', error);
      return false;
    }
  };

const signOut = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const deviceId = await AsyncStorage.getItem('device_id');

    console.log("🔍 Device ID récupéré depuis AsyncStorage:", deviceId);
    console.log("🔍 Token récupéré depuis AsyncStorage:", token);

    if (deviceId) {
      // 🔥 Supprimer les préférences côté serveur avant la déconnexion
      const params = new URLSearchParams();
      params.append('device_id', deviceId);

      console.log("📤 Envoi des paramètres à supprimer_preferences.php :", params.toString());

      const response = await api.post('supprimer_preferences.php', params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log("📩 Réponse brute de l'API :", response.data);

      if (response.data.success) {
        console.log(`✅ Préférences supprimées pour le device_id : ${deviceId}`);
      } else {
        console.warn(`⚠️ Échec de la suppression des préférences : ${response.data.message}`);
      }
    }

    // Maintenant, on peut se déconnecter du serveur
    if (token) {
      await api.post('deconnexion.php', null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // 🔥 Supprimer les données locales
    await AsyncStorage.multiRemove(['token', 'user_id', 'username', 'email', 'device_id', 'fcmToken']);

    setIsAuthenticated(false);
    console.log('🚪 Déconnecté et token FCM supprimé du storage local');
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion :', error);
  }
};




  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
