// utils/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://192.168.1.16/warmly_api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

api.interceptors.request.use(
  async (config) => {
    const userId = await AsyncStorage.getItem('user_id');
    const token = await AsyncStorage.getItem('token');
    console.log('🪪 Token utilisé :', token);

    // 🔐 Token pour toutes les requêtes
    if (!config.headers) config.headers = {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 🧠 Injecte utilisateur_id dans les POST sauf si JSON
    if (
      config.method === 'post' &&
      config.headers['Content-Type'] !== 'application/json'
    ) {
      if (config.data instanceof URLSearchParams) {
        config.data.append('utilisateur_id', userId || '');
      } else if (typeof config.data === 'string') {
        const params = new URLSearchParams(config.data);
        params.append('utilisateur_id', userId || '');
        config.data = params.toString();
      } else {
        const params = new URLSearchParams();
        params.append('utilisateur_id', userId || '');
        config.data = params.toString();
      }
    }

    return config;
  },
  (error) => {
    console.error('❌ Erreur dans l’intercepteur :', error);
    return Promise.reject(error);
  }
);

export default api;
