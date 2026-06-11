import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  Platform, Pressable, Modal, TextInput, Alert
} from 'react-native';
import { Bell, LogOut, KeyRound } from 'lucide-react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Logo } from '../../components/Logo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogoutModal } from '../../components/LogoutModal';
import api from '../../utils/api';

export default function SettingsScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const { signOut } = useAuth();
  const { getMessageStyle } = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [temperatureAlertsEnabled, setTemperatureAlertsEnabled] = useState(true);
  const [humidityAlertsEnabled, setHumidityAlertsEnabled] = useState(true);
  const [modeChangeAlertsEnabled, setModeChangeAlertsEnabled] = useState(true);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isChangePassVisible, setIsChangePassVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);


const fetchPreferences = async () => {
  try {
    const deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      console.warn("⚠️ Device ID manquant. Impossible de récupérer les préférences.");
      return;
    }

    // 🔴 Construction des données à envoyer
    const bodyData = new URLSearchParams();
    bodyData.append("device_id", deviceId);

    // 🔄 Requête avec Axios via `api`
    const response = await api.post('preferences.php', bodyData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded' // 🔥 Très important
      }
    });

    if (response.data.success && response.data.preferences) {
      console.log("✅ Préférences récupérées depuis la base :", response.data.preferences);

      const tempEnabled = response.data.preferences.temperature_notification === 1;
      const humidEnabled = response.data.preferences.humidite_notification === 1;
      const modeEnabled = response.data.preferences.mode_notification === 1;

      // Mise à jour des switches
      setTemperatureAlertsEnabled(tempEnabled);
      setHumidityAlertsEnabled(humidEnabled);
      setModeChangeAlertsEnabled(modeEnabled);

      // Sauvegarde des valeurs initiales dans AsyncStorage
      await AsyncStorage.setItem('temperature_alert', tempEnabled ? '1' : '0');
      await AsyncStorage.setItem('humidity_alert', humidEnabled ? '1' : '0');
      await AsyncStorage.setItem('mode_alert', modeEnabled ? '1' : '0');

      // Mise à jour du switch principal
      setNotificationsEnabled(tempEnabled || humidEnabled || modeEnabled);
    } else {
      console.warn("⚠️ Aucune préférence trouvée :", response.data.message);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des préférences :", error.message);
  }
};


useEffect(() => {
  fetchPreferences();
}, []);





  useEffect(() => {
    const fetchUserInfo = async () => {
      const storedName = await AsyncStorage.getItem('username');
      const storedEmail = await AsyncStorage.getItem('email');
      if (storedName) setUsername(storedName);
      if (storedEmail) setEmail(storedEmail);
    };
    fetchUserInfo();
  }, []);

const updateNotificationPreference = async (type, value) => {
  const deviceId = await AsyncStorage.getItem('device_id');

  if (!deviceId) {
    console.error("❌ Le device_id n'a pas été trouvé.");
    return;
  }

  // 🔴 Construction des données au format x-www-form-urlencoded
  const bodyData = new URLSearchParams();
  bodyData.append("device_id", deviceId);
  bodyData.append("type", type);
  bodyData.append("value", value ? 1 : 0);

  console.log(`🔄 Envoi de la requête : ${bodyData.toString()}`);

  try {
    const response = await api.post('preferences.php', bodyData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded' // 🔥 Très important
      }
    });

    console.log("🌐 Réponse reçue : ", response.data);

    if (response.data.success) {
      console.log(`✅ Préférence ${type} mise à jour avec succès`);
    } else {
      console.error(`❌ Erreur lors de la mise à jour : ${response.data.message}`);
    }
  } catch (error) {
    console.error("❌ Erreur réseau :", error.message);
  }
};





const handleMainSwitchChange = async (value) => {
  setNotificationsEnabled(value);

  const deviceId = await AsyncStorage.getItem('device_id');
  if (!deviceId) {
    console.error("❌ Le device_id n'a pas été trouvé.");
    return;
  }

  if (value) {
    // 🔄 Si on active, on récupère les valeurs précédemment sauvegardées
    const temperatureState = (await AsyncStorage.getItem('saved_temperature_alert')) === '1';
    const humidityState = (await AsyncStorage.getItem('saved_humidity_alert')) === '1';
    const modeState = (await AsyncStorage.getItem('saved_mode_alert')) === '1';

    // 🔄 On restaure l'affichage des switches
    setTemperatureAlertsEnabled(temperatureState);
    setHumidityAlertsEnabled(humidityState);
    setModeChangeAlertsEnabled(modeState);

    // 🔄 On met à jour dans la base de données
    await updateNotificationPreference('temperature_notification', temperatureState);
    await updateNotificationPreference('humidite_notification', humidityState);
    await updateNotificationPreference('mode_notification', modeState);

    console.log("✅ Valeurs restaurées depuis AsyncStorage et mises à jour dans la base de données.");

  } else {
    // 🔄 Si on désactive, on sauvegarde l'état actuel dans AsyncStorage
    await AsyncStorage.setItem('saved_temperature_alert', temperatureAlertsEnabled ? '1' : '0');
    await AsyncStorage.setItem('saved_humidity_alert', humidityAlertsEnabled ? '1' : '0');
    await AsyncStorage.setItem('saved_mode_alert', modeChangeAlertsEnabled ? '1' : '0');

    // 🔄 Puis on passe tout à false
    setTemperatureAlertsEnabled(false);
    setHumidityAlertsEnabled(false);
    setModeChangeAlertsEnabled(false);

    // 🔄 Et mise à jour en base
    await updateNotificationPreference('temperature_notification', 0);
    await updateNotificationPreference('humidite_notification', 0);
    await updateNotificationPreference('mode_notification', 0);

    console.log("✅ États sauvegardés dans AsyncStorage et switches désactivés.");
  }

  console.log("✅ Tous les switches sont mis à jour dans la base de données.");
};





const handleSwitchChange = async (type, value) => {
  if (!notificationsEnabled) return;

  // Mise à jour locale
  if (type === 'temperature_notification') setTemperatureAlertsEnabled(value);
  if (type === 'humidite_notification') setHumidityAlertsEnabled(value);
  if (type === 'mode_notification') setModeChangeAlertsEnabled(value);

  // Mise à jour AsyncStorage
  await AsyncStorage.setItem(`${type}_alert`, value ? '1' : '0');

  // Mise à jour Base de données
  await updateNotificationPreference(type, value);

  console.log(`✅ ${type} mis à jour dans la base de données et AsyncStorage.`);
};




  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

const handleChangePassword = async () => {
  if (!currentPassword || !newPassword) {
    setMessage('Tous les champs sont requis.');
    setMessageType('error');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('token');

    console.log('🔐 Token récupéré pour la requête:', token);
    console.log('📦 Payload à envoyer :', {
      ancien: currentPassword,
      nouveau: newPassword
    });

    const res = await api.post('changer_motdepasse.php', {
      ancien: currentPassword,
      nouveau: newPassword
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Réponse reçue de l\'API :', res.data);

    if (res.data.success) {
      setMessageType('success');
      setMessage(res.data.message);

      // Ferme le modal après un court délai
      setTimeout(() => {
        setIsChangePassVisible(false);
        setMessage('');
        setMessageType(null);
        setCurrentPassword('');
        setNewPassword('');
      }, 2000);
    } else {
      setMessageType('error');
      setMessage(res.data.error || 'Échec de la modification.');
    }

  } catch (err) {
    console.error('❌ Erreur lors de la requête changer_motdepasse.php :', err);
    setMessageType('error');
    setMessage('Erreur réseau : impossible de contacter le serveur.');
  }
};



  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <ThemeToggle />
      <View style={styles.header}>
        <Logo />
      </View>

      <View style={styles.content}>
        <View style={[styles.profileCard, isDark && styles.profileCardDark]}>
          <View style={[styles.profileImageContainer, isDark && styles.profileImageContainerDark]}>
            <View style={[styles.profileImage, { backgroundColor: isDark ? '#ffffff' : '#03082F' }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isDark && styles.profileNameDark, themeStyles.textSemiBold]}>
              {username}
            </Text>
            {email && (
              <Text style={[styles.profileEmail, isDark && styles.profileEmailDark]}>
                {email}
              </Text>
            )}
            <Pressable onPress={() => setIsChangePassVisible(true)} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <KeyRound size={18} color={isDark ? '#fff' : '#03082F'} />
                <Text style={[{ fontSize: 14 }, themeStyles.textMedium, isDark ? { color: '#fff' } : { color: '#03082F' }]}>
                  Changer le mot de passe
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={[styles.settingsCard, isDark && styles.settingsCardDark]}>
          <View style={[styles.settingItem, isDark && styles.settingItemDark]}>
            <View style={styles.settingContent}>
              <Bell size={24} color={isDark ? '#ffffff' : '#03082F'} />
              <Text style={[styles.settingText, isDark && styles.settingTextDark, themeStyles.textMedium]}>
                Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleMainSwitchChange}
              trackColor={{ false: '#767577', true: isDark ? '#ffffff40' : '#03082F40' }}
              thumbColor={notificationsEnabled ? (isDark ? '#ffffff' : '#03082F') : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.notificationTypes}>
              <View style={[styles.notificationType, isDark && styles.notificationTypeDark]}>
                <View style={styles.notificationTypeContent}>
                  <Text style={[styles.notificationTypeText, isDark && styles.notificationTypeTextDark, themeStyles.textMedium]}>
                    Alerte de température
                  </Text>
                  <Text style={[styles.notificationTypeSubtext, isDark && styles.notificationTypeSubtextDark, themeStyles.text]}>
                    Soyez au courant des changements de températures de vos pièces
                  </Text>
                </View>
<Switch
  value={temperatureAlertsEnabled}
  onValueChange={(value) => {
    setTemperatureAlertsEnabled(value);
    handleSwitchChange('temperature_notification', value);
  }}
  trackColor={{ false: '#767577', true: isDark ? '#ffffff40' : '#03082F40' }}
  thumbColor={temperatureAlertsEnabled ? (isDark ? '#ffffff' : '#03082F') : '#f4f3f4'}
  ios_backgroundColor="#3e3e3e"
  disabled={!notificationsEnabled}
/>


              </View>
<View style={[styles.notificationType, isDark && styles.notificationTypeDark]}>
  <View style={styles.notificationTypeContent}>
    <Text style={[styles.notificationTypeText, isDark && styles.notificationTypeTextDark, themeStyles.textMedium]}>
      Alerte d'humidité
    </Text>
    <Text style={[styles.notificationTypeSubtext, isDark && styles.notificationTypeSubtextDark, themeStyles.text]}>
      Soyez au courant des changements d'humidité de vos pièces
    </Text>
  </View>
<Switch
  value={humidityAlertsEnabled}
  onValueChange={(value) => {
    setHumidityAlertsEnabled(value);
    handleSwitchChange('humidite_notification', value);
  }}
  trackColor={{ false: '#767577', true: isDark ? '#ffffff40' : '#03082F40' }}
  thumbColor={humidityAlertsEnabled ? (isDark ? '#ffffff' : '#03082F') : '#f4f3f4'}
  ios_backgroundColor="#3e3e3e"
  disabled={!notificationsEnabled}
/>


</View>

              <View style={[styles.notificationType, isDark && styles.notificationTypeDark]}>
                <View style={styles.notificationTypeContent}>
                  <Text style={[styles.notificationTypeText, isDark && styles.notificationTypeTextDark, themeStyles.textMedium]}>
                    Alerte changement de mode
                  </Text>
                  <Text style={[styles.notificationTypeSubtext, isDark && styles.notificationTypeSubtextDark, themeStyles.text]}>
                    Soyez au courant lorsque vos radiateurs changent de mode
                  </Text>
                </View>
<Switch
  value={modeChangeAlertsEnabled}
  onValueChange={(value) => {
    setModeChangeAlertsEnabled(value);
    handleSwitchChange('mode_notification', value);
  }}
  trackColor={{ false: '#767577', true: isDark ? '#ffffff40' : '#03082F40' }}
  thumbColor={modeChangeAlertsEnabled ? (isDark ? '#ffffff' : '#03082F') : '#f4f3f4'}
  ios_backgroundColor="#3e3e3e"
  disabled={!notificationsEnabled}
/>


              </View>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.logoutButton, isDark && styles.logoutButtonDark]}
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <LogOut size={24} color={isDark ? '#ffffff' : '#03082F'} />
          <Text style={[styles.logoutText, isDark && styles.logoutTextDark, themeStyles.textSemiBold]}>
            Se déconnecter
          </Text>
        </Pressable>
      </View>

      <LogoutModal
        isVisible={isLogoutModalVisible}
        onClose={() => setIsLogoutModalVisible(false)}
        onConfirm={handleLogout}
      />

      {/* 🔐 Modal pour changer de mot de passe */}
<Modal visible={isChangePassVisible} transparent animationType="slide">
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  }}>
    <View style={{
      width: '90%',
      backgroundColor: isDark ? '#03082F' : '#fff',
      borderRadius: 16,
      padding: 20
    }}>
      <Text style={{
        fontSize: 18,
        marginBottom: 4,
        color: isDark ? '#fff' : '#03082F',
        fontFamily: themeStyles.textSemiBold.fontFamily
      }}>
        Modifier le mot de passe
      </Text>

      {message ? (
        <Text style={{
          marginBottom: 12,
          textAlign: 'center',
          color: messageType === 'success' ? '#4CAF50' : '#D32F2F',
          fontFamily: themeStyles.textMedium.fontFamily
        }}>
          {message}
        </Text>
      ) : null}

      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        placeholder="Mot de passe actuel"
        placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={[styles.input, isDark && styles.inputDark, { marginTop: 12 }]}
        placeholder="Nouveau mot de passe"
        placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
        <Pressable onPress={() => {
          setIsChangePassVisible(false);
          setMessage('');
          setMessageType(null);
          setCurrentPassword('');
          setNewPassword('');
        }}>
          <Text style={{ color: '#D32F2F' }}>Annuler</Text>
        </Pressable>
        <Pressable onPress={handleChangePassword}>
          <Text style={{ color: '#4CAF50' }}>Confirmer</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  containerDark: { backgroundColor: '#03082F' },
  header: { height: 100, paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 20 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      web: { elevation: 2 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  profileCardDark: { backgroundColor: '#03082F', borderWidth: 0, borderColor: '#ffffff20' },
  profileImageContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, padding: 4 },
  profileImageContainerDark: { backgroundColor: '#ffffff20' },
  profileImage: { width: '100%', height: '100%', borderRadius: 50 },
  profileInfo: { alignItems: 'center' },
  profileName: { fontSize: 24, color: '#03082F' },
  profileNameDark: { color: '#ffffff' },
  profileEmail: { fontSize: 14, color: '#03082F80', marginTop: 4 },
  profileEmailDark: { color: '#ffffff80' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, fontSize: 16, color: '#03082F', backgroundColor: '#fff'
  },
  inputDark: {
    backgroundColor: '#ffffff05', color: '#fff', borderColor: '#ffffff20'
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { elevation: 2 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  settingsCardDark: { backgroundColor: '#03082F', borderWidth: 0, borderColor: '#ffffff20' },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  settingItemDark: { backgroundColor: '#03082F' },
  settingContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { fontSize: 16, color: '#03082F' },
  settingTextDark: { color: '#ffffff' },
  notificationTypes: { borderTopWidth: 1, borderTopColor: '#E0E0E0'},
  notificationType: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notificationTypeDark: { backgroundColor: '#03082F', borderBottomColor: '#ffffff20' },
  notificationTypeContent: { flex: 1, paddingRight: 16 },
  notificationTypeText: { fontSize: 16, color: '#03082F', marginBottom: 4 },
  notificationTypeTextDark: { color: '#ffffff' },
  notificationTypeSubtext: { fontSize: 14, color: '#03082F80' },
  notificationTypeSubtextDark: { color: '#ffffff80' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      web: { elevation: 2 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  logoutButtonDark: { backgroundColor: '#03082F', borderWidth: 0, borderColor: '#ffffff20' },
  logoutText: { fontSize: 16, color: '#03082F' },
  logoutTextDark: { color: '#ffffff' },
});
