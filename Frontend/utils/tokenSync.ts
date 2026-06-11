import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

export const updateTokenToESP = async () => {
  try {
    console.log('📡 updateTokenToESP lancé...');

    const token = await AsyncStorage.getItem('token');
    const utilisateur_id = await AsyncStorage.getItem('user_id');

    console.log('🪪 Token utilisé :', token);

    if (!token || !utilisateur_id) {
      console.warn('❌ Token ou utilisateur_id manquant.');
      return;
    }

    const response = await api.get('radiateurs.php?action=lister');

    if (!response.data.success || !Array.isArray(response.data.radiateurs)) {
      console.warn('❌ Réponse invalide lors de la récupération des radiateurs.');
      return;
    }

    const radiateurs = response.data.radiateurs;
    console.log('🧪 Radiateurs récupérés pour mise à jour du token :', radiateurs);

    for (const rad of radiateurs) {
      if (!rad.id || !rad.piece_id) {
        console.warn('⚠️ Radiateur incomplet, ignoré :', rad);
        continue;
      }

      const payload = new URLSearchParams({
        radiateur_id: rad.id.toString(),
        piece_id: rad.piece_id.toString(),
        utilisateur_id: utilisateur_id,
        token: token,
      }).toString();

      console.log(`📤 Envoi token à radiateur ${rad.id} (pièce ${rad.piece_id})`);

      await api.post('radiateurs.php?action=mettre_a_jour_token', payload);
    }

    console.log('✅ Token envoyé à tous les radiateurs');
  } catch (error) {
    console.warn('⛔️ Erreur dans updateTokenToESP:', error);
  }
};
