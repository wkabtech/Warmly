import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, PermissionsAndroid, Alert  } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Snowflake, Power, Plus, Clock, X, Settings, LayoutGrid, Radiation as Radiator } from 'lucide-react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SettingsButton } from '../../components/SettingsButton';
import { Logo } from '../../components/Logo';
import { useTheme } from '../../context/ThemeContext';
import Modal from 'react-native-modal';
import api from '../../utils/api';
import { useEffect } from 'react'; // 👈 Assure-toi d'importer useEffect
import CustomAlertModal from '../../components/CustomAlertModal';
import { DashboardIcon, RoomsIcon } from '../../components/NavbarIcons';
import { useAuth } from '../../context/AuthContext';
import { PullToRefresh } from '../../components/PullToRefresh';
import { LoadingScreen } from '../../components/LoadingScreen';
import WifiManager from "react-native-wifi-reborn";
import AnimatedLoader from '../../components/AnimatedLoader';
import LoadingModalModule  from '../../components/LoadingModalModule';
import AsyncStorage from '@react-native-async-storage/async-storage';


type Mode = 'confort' | 'eco' | 'hors-gel' | 'arret' | 'prog';

interface Room {
  id: number;
  name: string;
  programMode: boolean;
  radiators: {
    name: string;
    mode: Mode;
    previousMode?: Mode;
    temp: number;
    humidity: number;
  }[];
}

export default function HomeScreen() {
  const { isDark, styles: themeStyles } = useTheme();
   const { isAuthenticated } = useAuth();
  const [isAddRadiatorModalVisible, setIsAddRadiatorModalVisible] = useState(false);
  const [newRadiatorName, setNewRadiatorName] = useState('');
  const [selectedRoomForRadiator, setSelectedRoomForRadiator] = useState<number | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<number[]>([1, 2, 3]);
  const [isAddRoomModalVisible, setIsAddRoomModalVisible] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isRoomSettingsModalVisible, setIsRoomSettingsModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDeleteRoomConfirmationVisible, setIsDeleteRoomConfirmationVisible] = useState(false);
  const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);
  const [selectedRadiator, setSelectedRadiator] = useState<{ roomId: number; radiatorName: string } | null>(null);
  const [isRadiatorSettingsModalVisible, setIsRadiatorSettingsModalVisible] = useState(false);
  const [selectedZoneForMove, setSelectedZoneForMove] = useState<number | null>(null);
  const [isModeModalVisible, setIsModeModalVisible] = useState(false);
  const [isDeleteRadiatorConfirmationVisible, setIsDeleteRadiatorConfirmationVisible] = useState(false);
  const [isCustomAlertVisible, setIsCustomAlertVisible] = useState(false); // ✅ Initialisé à false
const [customAlertMessage, setCustomAlertMessage] = useState('');
const [rooms, setRooms] = useState<Room[]>([]);
const [refreshing, setRefreshing] = useState(false);
const [isLoading, setIsLoading] = useState(true);
type AddRadiatorStep = 'searchingWifi' | 'connectingWifi' | 'wifiList' | 'wifiPassword' | 'radiatorInfo' | 'firmwareCheck' | 'firmwareUpdating' | 'firmwareSuccess';

const [currentAddRadiatorStep, setCurrentAddRadiatorStep] = useState<AddRadiatorStep>('searchingWifi');
const [wifiList, setWifiList] = useState<string[]>([]);
const [selectedWifi, setSelectedWifi] = useState<string | null>(null);
const [wifiPassword, setWifiPassword] = useState('');
const [isConnectingToWifi, setIsConnectingToWifi] = useState(false);
const [isIntroRadiatorModalVisible, setIsIntroRadiatorModalVisible] = useState(false);
const [isEspConnectingModalVisible, setIsEspConnectingModalVisible] = useState(false);
const [espError, setEspError] = useState(false);
const [globalError, setGlobalError] = useState('');
const [globalSuccess, setGlobalSuccess] = useState('');
const [isEspConnected, setIsEspConnected] = useState(false);
const [firmwareStatus, setFirmwareStatus] = useState<string>('checking');
const [firmwareMessage, setFirmwareMessage] = useState('');
const [isUpdatingFirmwareModalVisible, setIsUpdatingFirmwareModalVisible] = useState(false);


const getChipId = async (): Promise<string | null> => {
  try {
    const chipId = await AsyncStorage.getItem('chip_id');
    return chipId;
  } catch (error) {
    console.warn("Erreur récupération chip_id:", error);
    return null;
  }
};


const simulateWifiConnection = (password: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (password.length >= 8) {
        resolve(true);  // ✅ succès si le mot de passe a au moins 8 caractères
      } else {
        resolve(false); // ❌ échec sinon
      }
    }, 2000); // on simule 2 secondes de connexion
  });
};

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission de localisation requise',
          message: 'La permission de localisation est nécessaire pour détecter et se connecter au Wi-Fi.',
          buttonNeutral: 'Plus tard',
          buttonNegative: 'Annuler',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

const fetchAllData = async () => {
  const MIN_LOADING_TIME = 1000; // pour rendre fluide
  const start = Date.now();
  try {
    await Promise.all([
      setGlobalError(''),
      setGlobalSuccess(''),
      fetchRooms(),
      fetchRadiators()
    ]);
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  } finally {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  }
};

const onRefresh = async () => {
  setIsLoading(true);  // 👈 Ajoute cette ligne pour afficher le LoadingScreen aussi au refresh
  const MIN_LOADING_TIME = 1000; // 1 seconde minimum
  const start = Date.now();

  await fetchAllData();

  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
  setTimeout(() => {
    setIsLoading(false);
  }, remaining);
};



const fetchRooms = async () => {
  try {
    const response = await api.get('pieces.php?action=lister'); // 🔁 remplace axios par api
    console.log('🧪 Réponse pieces:', response.data);
    if (response.data.success) {
      const updatedRooms = response.data.pieces.map(piece => ({
        id: piece.id,
        name: piece.nom,
        programMode: piece.mode_prog == 1, // 🔥 Double égal pour accepter '1' ou 1,
        radiators: []
      }));
      setRooms(updatedRooms);
    } else {
      setGlobalError('Erreur', 'Impossible de récupérer les pièces.');
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  }
};


const fetchRadiators = async () => {
  try {
    const response = await api.get('radiateurs.php?action=lister');
    console.log('🧪 Réponse radiateurs:', response.data);

    const isSuccess = response.data.success === true || response.data.success === 'true';

    if (isSuccess && Array.isArray(response.data.radiateurs)) {
      const modeReverseTranslation = {
        'confort': 'confort',
        'eco': 'eco',
        'hors-gel': 'hors-gel',
        'arret': 'arret',
        'prog': 'prog'
      };

      const fetchedRadiators = response.data.radiateurs;

      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const radiateurs = fetchedRadiators
            .filter((radiator) => radiator.piece_nom === room.name)
            .map((radiator) => ({
              id: radiator.id,
              name: radiator.nom,
              mode: room.programMode ? 'prog' : (modeReverseTranslation[radiator.mode] || 'confort'),
              temp: radiator.temperature,
              humidity: radiator.humidite
            }));

          return {
            ...room,
            radiators: radiateurs
          };
        })
      );

    } else {
      console.warn('⚠️ Données radiateurs invalides ou "success" = false');
      setCustomAlertMessage('Erreur lors du chargement des radiateurs.');
      setIsCustomAlertVisible(true);
    }
  } catch (error) {
    console.error('❌ Erreur API radiateurs:', error.response?.data || error.message);
    setCustomAlertMessage('Erreur réseau ou serveur injoignable.');
    setIsCustomAlertVisible(true);
  }
};



useEffect(() => {
  if (isAuthenticated) {
    fetchAllData().then(() => {
      updateTokenToESP();
    });
  }
}, [isAuthenticated]);










  const toggleRoom = (roomId: number) => {
    setExpandedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

const toggleProgramMode = async (roomId: number) => {
  const selectedRoom = rooms.find(room => room.id === roomId);
  if (!selectedRoom) return;

  const newProgramMode = !selectedRoom.programMode;

  try {
    await api.post(
      'pieces.php?action=mode_prog',
      new URLSearchParams({
        piece_id: roomId.toString(),
        mode_prog: newProgramMode ? '1' : '0'
      }).toString()
    );

    if (newProgramMode) {
      setRooms(prevRooms =>
        prevRooms.map(room =>
          room.id === roomId
            ? {
                ...room,
                programMode: true,
                radiators: room.radiators.map(radiator => ({
                  ...radiator,
                  previousMode: radiator.mode,
                  mode: 'prog'
                }))
              }
            : room
        )
      );
    } else {
      const response = await api.get('radiateurs.php?action=lister');

      if (response.data.success) {
        const fetchedRadiators = response.data.radiateurs;

        setRooms(prevRooms =>
          prevRooms.map(room =>
            room.id === roomId
              ? {
                  ...room,
                  programMode: false,
                  radiators: fetchedRadiators
                    .filter(r => r.piece_nom === room.name)
                    .map(r => ({
                      id: r.id,
                      name: r.nom,
                      mode: r.mode,
                      temp: r.temperature,
                      humidity: r.humidite
                    }))
                }
              : room
          )
        );
      }
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  }
};



const getModeColor = (mode: Mode): string => {
    switch (mode) {
        case 'confort':
            return '#FF9800'; // Orange (Confort)
        case 'eco':
            return '#4CAF50'; // Vert (Éco)
        case 'hors-gel':
            return '#00A8E8'; // Bleu clair (Hors-gel)
        case 'arret':
            return '#D32F2F'; // Rouge (Arrêt)
        case 'prog':
            return '#9C27B0'; // Violet (Programmé)
        default:
            return '#FF9800'; // Par défaut : Orange
    }
};


const getModeIcon = (mode: Mode) => {
    switch (mode) {
        case 'confort':
            return <Sun size={18} strokeWidth={1.5} color="#FF9800" />;
        case 'eco':
            return <Moon size={18} strokeWidth={1.5} color="#4CAF50" />;
        case 'hors-gel':
            return <Snowflake size={18} strokeWidth={1.5} color="#00A8E8" />;
        case 'arret':
            return <Power size={18} strokeWidth={1.5} color="#D32F2F" />;
        case 'prog':
            return <Clock size={18} strokeWidth={1.5} color="#9C27B0" />;
        default:
            return null; // Au cas où un mode inattendu apparaît
    }
};


const getModeName = (mode: Mode): string => {
    switch (mode) {
        case 'confort':
            return 'Confort';
        case 'eco':
            return 'Éco';
        case 'hors-gel':
            return 'Hors-gel';
        case 'arret':
            return 'Arrêt';
        case 'prog':
            return 'Programmé';
        default:
            return 'Inconnu';
    }
};

const handleAddRoom = async () => {
  if (!newRoomName.trim()) return;

  try {
const response = await api.post(
  'pieces.php?action=ajouter',
  new URLSearchParams({ nom: newRoomName }).toString()
);

    if (response.data.success) {
      setGlobalSuccess('Succès', 'Pièce ajoutée avec succès.');
    } else {
      setGlobalError('Erreur', response.data.error || 'Erreur lors de l’ajout de la pièce.');
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  } finally {
    setIsAddRoomModalVisible(false);
    setNewRoomName('');
    await fetchRooms();
    await fetchRadiators();
  }
};











const handleDeleteRoom = async () => {
  if (!selectedRoom) return;

  try {
    const response = await api.post(
      'pieces.php?action=supprimer',
      new URLSearchParams({ id: selectedRoom.id.toString() }).toString()
    );

    if (response.data.success) {
      setGlobalSuccess('Succès', 'Pièce supprimée avec succès.', [
        { text: 'OK', onPress: () => setIsDeleteRoomConfirmationVisible(false) }
      ]);
      setIsRoomSettingsModalVisible(false);
    } else {
      setGlobalError('Erreur', response.data.error || 'Erreur lors de la suppression de la pièce.');
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  } finally {
    setIsDeleteRoomConfirmationVisible(false);
    setIsRoomSettingsModalVisible(false);
    await fetchRooms();
    await fetchRadiators();
  }
};







const handleModeSelect = (mode: Mode) => {
    const modeMapping = {
        comfort: 'confort',
        eco: 'eco',
        frost: 'hors-gel',
        off: 'arret',
        program: 'prog' // Même si ce mode est hors-scope actuellement
    };

    const selectedMode = modeMapping[mode] || 'arret'; // ➤ Par défaut "arret" si le mode est inconnu

    console.log('🟡 Mode sélectionné:', selectedMode);

    if (selectedRadiator) {
        handleChangeRadiatorMode(selectedRadiator.radiatorId, selectedMode);
    }
};

const { signOut } = useAuth();

const handleAddRadiator = async () => {
  if (!selectedRoomForRadiator) {
    setCustomAlertMessage('Veuillez ajouter une pièce avant d’ajouter un radiateur.');
    setIsCustomAlertVisible(true);
    return;
  }

  if (!newRadiatorName.trim()) return;

  try {
    const token = await AsyncStorage.getItem('token');
    const utilisateur_id = await AsyncStorage.getItem('user_id');
    const chip_id = await AsyncStorage.getItem('chip_id');

    if (!token || !utilisateur_id || !chip_id) {
      setGlobalError('Erreur', 'Données manquantes pour finaliser l’ajout.');
      signOut();
      return;
    }

    const response = await api.post(
      'radiateurs.php?action=ajouter',
      new URLSearchParams({
        piece_id: selectedRoomForRadiator.toString(),
        nom: newRadiatorName.trim(),
        utilisateur_id,
        token,
        chip_id
      }).toString()
    );


    console.log("📥 [ADD_RAD] Réponse ajout radiateur:", response.data);

    if (response.data.success && response.data.radiateur_id) {
      const radiateur_id = response.data.radiateur_id;

      // 🔁 Notifie le serveur pour qu’il pousse les infos via MQTT
      await api.post(
        'radiateurs.php?action=mettre_a_jour_token',
        new URLSearchParams({
          radiateur_id: radiateur_id.toString(),
          piece_id: selectedRoomForRadiator.toString(),
          utilisateur_id,
          token
        }).toString()
      );

      console.log("📡 [MQTT] Info push demandée via serveur");

      setGlobalSuccess('Succès', 'Radiateur ajouté avec succès.');
      setIsAddRadiatorModalVisible(false);
      setNewRadiatorName('');
      setSelectedRoomForRadiator(null);
    } else {
      setGlobalError('Erreur', response.data.error || 'Erreur lors de l’ajout du radiateur.');
    }
  } catch (error) {
    console.error("❌ [ADD_RAD] Erreur lors de l’ajout du radiateur:", error);
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  } finally {
    await fetchRadiators();
  }
};




















const handleMoveRadiator = async () => {
  if (!selectedRadiator || selectedZoneForMove === null) return;

  try {
    const token = await AsyncStorage.getItem('token');
    const utilisateur_id = await AsyncStorage.getItem('user_id');

    if (!token || !utilisateur_id) {
      setGlobalError('Erreur', 'Token ou ID utilisateur manquant.');
      return;
    }

    const response = await api.post(
      'radiateurs.php?action=deplacer',
      new URLSearchParams({
        radiateur_id: selectedRadiator.radiatorId.toString(),
        nouvelle_piece_id: selectedZoneForMove.toString(),
        utilisateur_id: utilisateur_id,
        token: token
      }).toString()
    );

    if (response.data.success) {
      setGlobalSuccess('Succès', 'Radiateur déplacé avec succès.');
      await fetchRadiators(); // 🔁 recharge propre
    } else {
      setGlobalError('Erreur', response.data.error || 'Erreur lors du déplacement du radiateur.');
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  } finally {
    setIsRadiatorSettingsModalVisible(false);
    setSelectedZoneForMove(null);
    setSelectedRadiator(null);
  }
};




const modeTranslation = {
    'comfort': 'confort',
    'eco': 'eco',
    'frost': 'hors-gel',
    'off': 'arret'
};

const handleChangeRadiatorMode = async (radiatorId: number, newMode: Mode) => {
  const modeFr = modeTranslation[newMode] || newMode;

  try {
    const response = await api.post(
      'radiateurs.php?action=modifier_mode',
      new URLSearchParams({
        radiateur_id: radiatorId.toString(),
        mode: modeFr
      }).toString()
    );

    if (response.data.success) {
      CustomAlertModal({ message: `Mode changé en "${getModeName(newMode)}"` });

      setRooms((prevRooms) =>
        prevRooms.map((room) => ({
          ...room,
          radiators: room.radiators.map((radiator) =>
            radiator.id === radiatorId ? { ...radiator, mode: newMode } : radiator
          )
        }))
      );
    } else {
      CustomAlertModal({ message: response.data.error || 'Erreur lors du changement de mode.' });
    }
  } catch (error) {
    CustomAlertModal({ message: 'Erreur réseau ou serveur injoignable.' });
  } finally {
    setIsModeModalVisible(false);
    await fetchRadiators();
  }
};



const checkFirmwareStatus = async () => {
  const handleFirmwareFailure = (status: string, message: string) => {
    setFirmwareStatus(status);
    setIsAddRadiatorModalVisible(false);
    setGlobalError(message);
  };

  try {
    console.log("🟢 [Firmware] Lancement de la vérification du firmware");
    setFirmwareStatus('checking');
    await new Promise(res => setTimeout(res, 2000)); // ← garde le status visible ~2s


    const chipId = await getChipId();
    console.log("🔍 [Firmware] Chip ID récupéré depuis AsyncStorage:", chipId);

    if (!chipId) {
      console.warn("⛔️ [Firmware] Aucun chipId trouvé.");
      handleFirmwareFailure('error_no_chip_id', "Aucun identifiant de module trouvé.");
      return;
    }

    const response = await api.get(`espversion.php?chip_id=${chipId}`);
    const status = response.data.update_status;
    console.log("📡 [Firmware] Statut actuel :", status);

    if (status === 'up_to_date') {
      console.log("✅ [Firmware] Déjà à jour");
      setFirmwareStatus('up_to_date');
      setCurrentAddRadiatorStep('firmwareSuccess');
      await new Promise(res => setTimeout(res, 3000));

    } else if (status === 'update_available') {
      console.log("🆕 [Firmware] Mise à jour disponible → lancement de l'OTA");

      const updateResponse = await api.post(
        'espversion.php',
        new URLSearchParams({ chip_id, action: 'start_update' }).toString()
      );

      console.log("📨 [Firmware] Réponse start_update :", updateResponse.data);

      if (updateResponse.data.success) {
        setFirmwareStatus('updating');
        setCurrentAddRadiatorStep('firmwareUpdating');
        await new Promise(res => setTimeout(res, 1000));

        let isUpdated = false;
        for (let i = 0; i < 10; i++) {
          console.log(`⏳ [Firmware] Tentative ${i + 1} : Attente du redémarrage...`);
          await new Promise(res => setTimeout(res, 3000));

          try {
            const checkAgain = await api.get(`espversion.php?chip_id=${chipId}`);
            console.log("📡 [Firmware] Re-check statut :", checkAgain.data.update_status);

            if (checkAgain.data.update_status === 'up_to_date') {
              isUpdated = true;
              break;
            }
          } catch (e) {
            console.warn("⚠️ [Firmware] Erreur lors du re-check :", e.message);
          }
        }

        if (isUpdated) {
          console.log("🎉 [Firmware] MAJ terminée avec succès !");
          setFirmwareStatus('up_to_date');
          setCurrentAddRadiatorStep('firmwareSuccess');
          await new Promise(res => setTimeout(res, 3000));
        } else {
          console.warn("⛔️ [Firmware] MAJ non confirmée après 10 tentatives");
          handleFirmwareFailure('update_failed', "La mise à jour du firmware a échoué ou a pris trop de temps.");
        }

      } else {
        console.warn("⛔️ [Firmware] Échec start_update");
        handleFirmwareFailure('error_update_start', "Impossible de démarrer la mise à jour du firmware.");
      }

    } else if (status === 'updating') {
      console.log("🕒 [Firmware] Mise à jour en cours, on patiente avant re-check...");

      setFirmwareStatus('updating');
      setCurrentAddRadiatorStep('firmwareUpdating');

      let isUpdated = false;
      for (let i = 0; i < 10; i++) {
        console.log(`⏳ [Firmware] Attente tentative ${i + 1}/10...`);
        await new Promise(res => setTimeout(res, 3000));

        try {
          const checkAgain = await api.get(`espversion.php?chip_id=${chipId}`);
          console.log("📡 [Firmware] Re-check après 'updating':", checkAgain.data.update_status);

          if (checkAgain.data.update_status === 'up_to_date') {
            isUpdated = true;
            break;
          }
        } catch (e) {
          console.warn("⚠️ [Firmware] Erreur lors du re-check :", e.message);
        }
      }

      if (isUpdated) {
        console.log("🎉 [Firmware] MAJ confirmée après statut 'updating' !");
        setFirmwareStatus('up_to_date');
        setCurrentAddRadiatorStep('firmwareSuccess');
        await new Promise(res => setTimeout(res, 3000));
      } else {
        console.warn("❌ [Firmware] Toujours pas 'up_to_date' après 10 tentatives.");
        handleFirmwareFailure('update_failed', "La mise à jour du firmware a échoué.");
      }

    } else {
      console.warn("❓ [Firmware] Statut inconnu :", status);
      handleFirmwareFailure('error_unknown_status', "La vérification du firmware a échoué.");
    }

  } catch (err) {
    console.error("❌ [Firmware] Exception attrapée :", err.message || err);
    handleFirmwareFailure('error_network', "Problème de connexion pendant la mise à jour.");
  }
};



const abortESPAppairage = async () => {
  try {
    console.log("🚪 Envoi de /abort à l’ESP...");
    const res = await fetch("http://192.168.4.1/abort", { method: "POST" });
    const text = await res.text();
    console.log("📬 Réponse de l’ESP /abort :", res.status, text);
  } catch (err) {
    console.warn("⚠️ Échec de l’appel /abort :", err.message);
  }
};









const handleDeleteRadiator = async () => {
  if (!selectedRadiator || !selectedRadiator.radiatorId) return;

  try {
    const response = await api.post(
      'radiateurs.php?action=supprimer',
      new URLSearchParams({
        radiateur_id: selectedRadiator.radiatorId.toString()
      }).toString()
    );

    if (response.data.success) {
      setGlobalSuccess('Succès', 'Radiateur supprimé avec succès.');

      setRooms((prevRooms) =>
        prevRooms.map((room) => ({
          ...room,
          radiators: room.radiators.filter(
            (radiator) => radiator.id !== selectedRadiator.radiatorId
          )
        }))
      );
    } else {
      setGlobalError('Erreur', response.data.error || 'Erreur lors de la suppression du radiateur.');
    }
  } catch (error) {
    setGlobalError('Erreur', 'Erreur réseau ou serveur injoignable.');
  } finally {
    setIsRadiatorSettingsModalVisible(false);
    setIsDeleteRadiatorConfirmationVisible(false);
    await fetchRadiators();
  }
};

const scanWifiFromESP = async () => {
  try {
    setCurrentAddRadiatorStep('searchingWifi');

    const res = await fetch("http://192.168.4.1/scan"); // l’ESP est en AP
    const data = await res.json(); // tableau de SSID

    setWifiList(data);
    setCurrentAddRadiatorStep('wifiList');
  } catch (e) {
    setGlobalError("Erreur", "Impossible de scanner les réseaux Wi-Fi depuis l'ESP.");
    setCurrentAddRadiatorStep('wifiList');
  }
};


const sendWifiConfigToESP = async (): Promise<boolean> => {
  try {
    const configPayload = {
      ssid: selectedWifi,
      password: wifiPassword,
    };

    console.log("📡 Envoi à /config :", configPayload);

    const response = await fetch("http://192.168.4.1/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configPayload),
    });

    if (!response.ok) {
      const data = await response.json();
      setGlobalError("Erreur", data?.error || "Échec de l'envoi.");
      return false;
    }

    console.log("✅ Config envoyée. Attente du redémarrage de l’ESP...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const maxAttempts = 8;
    let attempt = 0;

    while (attempt < maxAttempts) {
      console.log(`🔁 Tentative ${attempt + 1} pour check_esp_status.php`);
      try {
        const checkResp = await api.get("check_esp_status.php");
        console.log("📡 Résultat:", checkResp.data);

        if (checkResp.data.connected && checkResp.data.chip_id) {
          await AsyncStorage.setItem('chip_id', checkResp.data.chip_id.toString());
          console.log("✅ chip_id sauvegardé:", checkResp.data.chip_id);

          setIsEspConnected(true);
          setCurrentAddRadiatorStep('connectingWifi');
          await new Promise((res) => setTimeout(res, 3000));

          // ✅ Affiche le modal de vérification de firmware
          setCurrentAddRadiatorStep('firmwareCheck');
          await checkFirmwareStatus();

          // La suite est gérée dans checkFirmwareStatus
          return true;
        }
      } catch (e) {
        console.warn("⛔️ Erreur réseau check_esp_status:", e.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempt++;
    }

    return false;

  } catch (error) {
    console.error("🚫 Erreur lors de l'envoi config ESP:", error);
    return false;
  }
};


















const handleFabMenuItemPress = (action: 'room' | 'radiator') => {
  console.log('[FAB] Bouton appuyé - action :', action);
  setIsFabMenuVisible(false);

  if (action === 'room') {
    console.log('[FAB] Ouverture du modal de pièce');
    setIsAddRoomModalVisible(true);
  } else if (action === 'radiator') {
    if (rooms.length === 0) {
      setCustomAlertMessage('Veuillez ajouter une pièce avant d’ajouter un radiateur.');
      setIsCustomAlertVisible(true);
      return;
    }

    // ➤ Au lieu de démarrer la connexion directe, on affiche la modale d’intro
    setIsIntroRadiatorModalVisible(true);
  }
};


const connectToESPWifi = async () => {
  const ssidESP = "Warmly_ESP";
  const passwordESP = "warmly1234";
    setIsEspConnected(false);
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    setGlobalError("Permission refusée", "Impossible de se connecter à l'ESP sans la permission de localisation.");
    return;
  }

  try {
    setEspError(false); // 🔁 Reset avant toute tentative
    console.log('[ESP] Connexion au Wi-Fi ESP...');
    setIsEspConnectingModalVisible(true); // ✅ Affiche le loader

    await WifiManager.connectToProtectedSSID(ssidESP, passwordESP, false, false);
    console.log('[ESP] ✅ Connexion au Wi-Fi ESP réussie');

    setIsAddRadiatorModalVisible(true);
    setCurrentAddRadiatorStep('searchingWifi');

    setTimeout(async () => {
      try {
        const res = await fetch("http://192.168.4.1/scan");
        const wifiListFromESP = await res.json();
        setWifiList(wifiListFromESP);
        setCurrentAddRadiatorStep('wifiList');
      } catch (err) {
        setGlobalError("Erreur", "Impossible de scanner les réseaux Wi-Fi depuis l'ESP.");
        setCurrentAddRadiatorStep('wifiList');
      }
    }, 500);
  } catch (err) {
    console.error('[ESP] ❌ Échec connexion ESP :', err);
    setIsEspConnectingModalVisible(false);
    setGlobalError('');
    setGlobalError("Impossible de se connecter au module, veuillez réessayer.");
  } finally {
    setIsEspConnectingModalVisible(false); // ✅ Cache le loader
  }
};


const updateTokenToESP = async () => {
  try {
    console.log("✅ updateTokenToESP called")
    const token = await AsyncStorage.getItem('token');
    const utilisateur_id = await AsyncStorage.getItem('user_id');

    if (!token || !utilisateur_id) return;

    const response = await api.get('radiateurs.php?action=lister');
    if (!response.data.success || !Array.isArray(response.data.radiateurs)) return;

    for (const rad of response.data.radiateurs) {
      await api.post(
        'radiateurs.php?action=mettre_a_jour_token',
        new URLSearchParams({
          radiateur_id: rad.id.toString(),
          piece_id: rad.piece_id.toString(),
          utilisateur_id: utilisateur_id,
          token: token
        }).toString()
      );
    }

    console.log('✅ Token envoyé à tous les radiateurs');
  } catch (error) {
    console.warn('⛔️ Erreur lors de l’envoi du token aux ESP:', error);
  }
};



  const modes: Array<{ id: Mode; label: string; color: string }> = [
    { id: 'confort', label: 'Confort', color: '#FF9800' },
    { id: 'eco', label: 'Éco', color: '#4CAF50' },
    { id: 'hors-gel', label: 'Hors-gel', color: '#00A8E8' },
    { id: 'arret', label: 'Arrêt', color: '#D32F2F' }
  ];

if (isLoading) {
  return <LoadingScreen />;
}

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <ThemeToggle />
        <SettingsButton />
        <View style={styles.header}>
          <Logo />
        </View>
{globalError ? (
  <Text style={{
    color: '#D32F2F',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    fontSize: 14,
  }}>
    {globalError}
  </Text>
) : null}
{globalSuccess ? (
  <Text style={{
    color: '#4CAF50',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    fontSize: 14,
  }}>
    {globalSuccess}
  </Text>
) : null}

{firmwareMessage ? (
  <Text style={{
    color: firmwareStatus === 'up_to_date' ? '#4CAF50' : '#FF9800',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14
  }}>
    {firmwareMessage}
  </Text>
) : null}

        {rooms.map((room) => (
          <View key={room.id} style={[styles.roomContainer, isDark && styles.roomContainerDark]}>
            <Pressable
              style={[styles.roomHeader, isDark && styles.roomHeaderDark]}
              onPress={() => toggleRoom(room.id)}
            >
              <View style={styles.roomTitle}>
                {expandedRooms.includes(room.id) ? (
                  <ChevronDown size={20} color={isDark ? '#ffffff' : '#03082F'} />
                ) : (
                  <ChevronRight size={20} color={isDark ? '#ffffff' : '#03082F'} />
                )}
                <Text style={[styles.roomName, isDark && styles.roomNameDark, themeStyles.textSemiBold]}>
                  {room.name}
                </Text>
              </View>
              <View style={styles.roomHeaderActions}>
                <Pressable onPress={() => toggleProgramMode(room.id)}>
                  <Text style={[
                    styles.programMode,
                    isDark && styles.programModeDark,
                    room.programMode && styles.programModeActive,
                    room.programMode && isDark && styles.programModeActiveDark,
                    themeStyles.textMedium
                  ]}>
                    Mode Prog : {room.programMode ? 'On' : 'Off'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.roomSettingsButton}
                  onPress={() => {
                    setSelectedRoom(room);
                    setIsRoomSettingsModalVisible(true);
                  }}
                >
                  <Settings size={20} color={isDark ? '#ffffff80' : '#03082F80'} />
                </Pressable>
              </View>
            </Pressable>

{expandedRooms.includes(room.id) && (
  <View style={[styles.radiatorsList, isDark && styles.radiatorsListDark]}>
    {room.radiators.map((radiator, index) => (
      <View
        key={index}
        style={[
          styles.radiatorCard,
          isDark && styles.radiatorCardDark,
          { borderLeftColor: getModeColor(radiator.mode) }
        ]}
      >
        <View style={styles.radiatorInfo}>
          <Text style={[styles.radiatorName, isDark && styles.radiatorNameDark, themeStyles.textMedium]}>
            {radiator.name}
          </Text>

          {/* 🔥 Nouveau container pour la température et l'humidité */}
          <View style={styles.tempHumidityContainer}>
            <Text style={[styles.radiatorTemp, isDark && styles.radiatorTempDark, themeStyles.textBold]}>
              {radiator.temp !== null && radiator.temp !== undefined
                ? `${radiator.temp.toFixed(1)}°C`
                : 'N/A'}
            </Text>

  {typeof radiator.temp === 'number' && !isNaN(radiator.temp) && typeof radiator.humidity === 'number' && !isNaN(radiator.humidity) ? (
    <Text style={[styles.radiatorHumidity, isDark && styles.radiatorHumidityDark, themeStyles.textMedium]}>
      {`${radiator.humidity.toFixed(1)}% (H)`}
    </Text>
  ) : null}
</View>
        </View>
        <View style={styles.modeInfo}>
          <Pressable
            style={[
              styles.modeTag,
              { backgroundColor: getModeColor(radiator.mode) + '20' }
            ]}
            onPress={() => {
              console.log("✅ Changement de mode activé pour :", radiator.name);
              if (!room.programMode) {
                setSelectedRadiator({
                  roomId: room.id,
                  radiatorId: radiator.id,
                  radiatorName: radiator.name
                });
                setIsModeModalVisible(true); // 🔥 Ceci ouvre le modal
              }
            }}
          >
            {getModeIcon(radiator.mode)}
            <Text style={[
              styles.modeText,
              { color: getModeColor(radiator.mode) },
              themeStyles.textMedium
            ]}>
              {getModeName(radiator.mode)}
            </Text>
          </Pressable>
          <Pressable
            style={styles.settingsButton}
            onPress={() => {
              setSelectedRadiator({ roomId: room.id, radiatorId: radiator.id, radiatorName: radiator.name });
              setIsRadiatorSettingsModalVisible(true);
              setSelectedZoneForMove(rooms.find(r => r.id !== room.id)?.id || null);
            }}
          >
            <Settings size={20} color={isDark ? '#ffffff80' : '#03082F80'} />
          </Pressable>
        </View>

      </View>
    ))}
  </View>
)}

          </View>
        ))}
      </PullToRefresh>

      <Pressable
        style={[styles.fab, isDark && styles.fabDark]}
        onPress={() => setIsFabMenuVisible(true)}
      >
        <Plus size={24} color={isDark ? '#03082F' : '#ffffff'} />
      </Pressable>

      <Modal
        isVisible={isFabMenuVisible}
        onBackdropPress={() => setIsFabMenuVisible(false)}
        onBackButtonPress={() => setIsFabMenuVisible(false)}
        style={styles.fabMenuModal}
        backdropOpacity={0.3}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        hideModalContentWhileAnimating
      >
        <View style={styles.fabMenuContainer}>
          <Pressable
            style={[styles.fabMenuItem, isDark && styles.fabMenuItemDark]}
            onPress={() => handleFabMenuItemPress('room')}
          >
            <DashboardIcon size={24} color={isDark ? '#ffffff' : '#03082F'} />
            <Text style={[styles.fabMenuItemText, isDark && styles.fabMenuItemTextDark, themeStyles.textMedium]}>
              Ajouter une pièce
            </Text>
          </Pressable>

<Pressable
    style={[
        styles.fabMenuItem,
        isDark && styles.fabMenuItemDark,
        rooms.length === 0 && styles.fabMenuItemDisabled // ✅ Grise si aucune pièce
    ]}
    onPress={() => {
        if (rooms.length === 0) {
            setIsCustomAlertVisible(true);  // 🔥 Affiche la modale si aucune pièce
        } else {
            handleFabMenuItemPress('radiator');
        }
    }}
>
    <RoomsIcon size={24} color={isDark ? '#ffffff' : '#03082F'} />
    <Text style={[styles.fabMenuItemText, isDark && styles.fabMenuItemTextDark, themeStyles.textMedium]}>
        Ajouter un radiateur
    </Text>
</Pressable>



        </View>
      </Modal>
      <Modal
        isVisible={isIntroRadiatorModalVisible}
        onBackdropPress={() => setIsIntroRadiatorModalVisible(false)}
        onBackButtonPress={() => setIsIntroRadiatorModalVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.addRoomModal, isDark && styles.addRoomModalDark]}>
          <View style={styles.addRoomModalHeader}>
            <Text style={[styles.addRoomModalTitle, isDark && styles.addRoomModalTitleDark, themeStyles.textSemiBold]}>
              Connexion au module
            </Text>
            <Pressable onPress={() => setIsIntroRadiatorModalVisible(false)}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={styles.addRoomModalContent}>
            <View style={{ marginBottom: 12 }}>
              <Text style={[themeStyles.text, { textAlign: 'center', color: isDark ? '#fff' : '#000' }]}>
                -   Activez votre Wi-Fi
              </Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={[themeStyles.text, { textAlign: 'center', color: isDark ? '#fff' : '#000' }]}>
                -   Activez la géolocalisation
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={[themeStyles.text, { textAlign: 'center', color: isDark ? '#fff' : '#000' }]}>
                -   Maintenez le bouton du module pendant 3 secondes, puis appuyez sur "Commencer"
              </Text>
            </View>

<Pressable
  style={[styles.addRoomModalButton, isDark && styles.addRoomModalButtonDark]}
  onPress={() => {
    setIsIntroRadiatorModalVisible(false); // Ferme le modal d’intro

    // Lance la connexion après un petit délai
    setTimeout(() => {
      connectToESPWifi(); // ✅ Lance directement la logique de connexion
    }, 400);
  }}
>
  <Text style={[styles.addRoomModalButtonText, isDark && styles.addRoomModalButtonTextDark, themeStyles.textMedium]}>
    Commencer
  </Text>
</Pressable>

          </View>
        </View>
      </Modal>

<Modal
  isVisible={isAddRadiatorModalVisible}
  onBackdropPress={() => {
    abortESPAppairage();
    setIsAddRadiatorModalVisible(false);
  }}
  onBackButtonPress={() => {
    abortESPAppairage();
    setIsAddRadiatorModalVisible(false);
  }}
    useNativeDriver
    hideModalContentWhileAnimating
    style={styles.modal}
>
    <View style={[styles.addRoomModal, isDark && styles.addRoomModalDark]}>
        <View style={styles.addRoomModalHeader}>
            <Text style={[styles.addRoomModalTitle, isDark && styles.addRoomModalTitleDark, themeStyles.textSemiBold]}>
                Ajouter un radiateur
            </Text>
<Pressable
  onPress={() => {
    abortESPAppairage();
    setIsAddRadiatorModalVisible(false);
  }}
>
  <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
</Pressable>

        </View>

        <View style={styles.addRoomModalContent}>
{currentAddRadiatorStep === 'searchingWifi' && (
  <LoadingModalModule
    title="Recherche de réseaux Wi-Fi..."
  />
)}

{currentAddRadiatorStep === 'connectingWifi' && (
  <LoadingModalModule
    title="Connexion au réseau Wi-Fi..."
    isSuccess={isEspConnected}
  />
)}
{currentAddRadiatorStep === 'firmwareCheck' && (
  <LoadingModalModule title="Vérification du firmware..." />
)}
{currentAddRadiatorStep === 'firmwareUpdating' && (
  <LoadingModalModule title="Mise à jour du firmware en cours..." />
)}

{currentAddRadiatorStep === 'firmwareSuccess' && (
  <LoadingModalModule title="Firmware à jour" isSuccess />
)}


            {currentAddRadiatorStep === 'wifiList' && (
                <View>
                    <Text style={[styles.addRoomModalLabel, isDark && styles.addRoomModalLabelDark, themeStyles.textMedium]}>
                      Choisissez un réseau Wi-Fi :
                    </Text>
                    {wifiList.map((wifi, index) => (
                        <Pressable
                            key={index}
                            style={[styles.wifiItem, selectedWifi === wifi && styles.wifiItemSelected]}
                            onPress={() => {
                                setSelectedWifi(wifi);
                                setCurrentAddRadiatorStep('wifiPassword');
                            }}
                        >
                            <Text style={[styles.wifiName, isDark && styles.wifiNameDark, themeStyles.text]}>
                              {wifi}
                            </Text>

                        </Pressable>
                    ))}
                </View>
            )}

            {currentAddRadiatorStep === 'wifiPassword' && selectedWifi && (
                <View>
                    <Text style={[styles.addRoomModalLabel, isDark && styles.addRoomModalLabelDark, themeStyles.textMedium]}>
                      Mot de passe pour "{selectedWifi}"
                    </Text>
<TextInput
  style={[styles.addRoomModalInput, isDark && styles.addRoomModalInputDark, { marginTop: 8 }]}
  secureTextEntry
  placeholder="Mot de passe Wi-Fi"
  placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
  value={wifiPassword}
  onChangeText={setWifiPassword}
/>

                    <Pressable
                        style={[styles.addRoomModalButton, isDark && styles.addRoomModalButtonDark, { marginTop: 16 }]}
onPress={async () => {
  if (!wifiPassword.trim()) return;

  console.log("📤 Envoi config à l’ESP...", {
    ssid: selectedWifi,
    password: wifiPassword
  });

  setIsConnectingToWifi(true);
  setCurrentAddRadiatorStep('connectingWifi');

  const configSuccess = await sendWifiConfigToESP();
  setIsConnectingToWifi(false);

  if (configSuccess) {
    setCurrentAddRadiatorStep('radiatorInfo');
  } else {
    setIsAddRadiatorModalVisible(false);
    setGlobalError("Impossible de se connecter au Wi-Fi, vérifiez votre connexion et réessayer.");
  }
}}


                    >
                        <Text style={[styles.addRoomModalButtonText, isDark && styles.addRoomModalButtonTextDark, themeStyles.textMedium]}>
                          Se connecter
                        </Text>

                    </Pressable>
                </View>
            )}

            {currentAddRadiatorStep === 'radiatorInfo' && (
                <>
                    <View style={[styles.roomSelectionContainer, isDark && styles.roomSelectionContainerDark]}>
                        <Pressable
                            style={styles.arrowButton}
                            onPress={() => {
                                const currentIndex = rooms.findIndex(room => room.id === selectedRoomForRadiator);
                                const prevIndex = currentIndex > 0 ? currentIndex - 1 : rooms.length - 1;
                                setSelectedRoomForRadiator(rooms[prevIndex]?.id || null);
                            }}
                        >
                            <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
                        </Pressable>

                        <Text style={[styles.roomNameText, isDark && styles.roomNameTextDark]}>
                            {rooms.find(room => room.id === selectedRoomForRadiator)?.name || 'Aucune pièce'}
                        </Text>

                        <Pressable
                            style={styles.arrowButton}
                            onPress={() => {
                                const currentIndex = rooms.findIndex(room => room.id === selectedRoomForRadiator);
                                const nextIndex = currentIndex < rooms.length - 1 ? currentIndex + 1 : 0;
                                setSelectedRoomForRadiator(rooms[nextIndex]?.id || null);
                            }}
                        >
                            <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
                        </Pressable>
                    </View>

                    <Text style={styles.addRoomModalLabel}>Nom du radiateur</Text>
                    <TextInput
                        style={[styles.addRoomModalInput, isDark && styles.addRoomModalInputDark]}
                        value={newRadiatorName}
                        onChangeText={setNewRadiatorName}
                        placeholder="Entrez le nom du radiateur"
                        placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
                    />
                    <Pressable
                        style={[styles.addRoomModalButton, isDark && styles.addRoomModalButtonDark]}
                        onPress={handleAddRadiator}
                    >
                        <Text style={[styles.addRoomModalButtonText, isDark && styles.addRoomModalButtonTextDark]}>
                            Ajouter
                        </Text>
                    </Pressable>
                </>
            )}

            {currentAddRadiatorStep === 'default' && (
                <>
                    {/* 🔥 Formulaire simple (fallback) */}
                    <View style={[styles.roomSelectionContainer, isDark && styles.roomSelectionContainerDark]}>
                        <Pressable
                            style={styles.arrowButton}
                            onPress={() => {
                                const currentIndex = rooms.findIndex(room => room.id === selectedRoomForRadiator);
                                const prevIndex = currentIndex > 0 ? currentIndex - 1 : rooms.length - 1;
                                setSelectedRoomForRadiator(rooms[prevIndex]?.id || null);
                            }}
                        >
                            <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
                        </Pressable>

                        <Text style={[styles.roomNameText, isDark && styles.roomNameTextDark]}>
                            {rooms.find(room => room.id === selectedRoomForRadiator)?.name || 'Aucune pièce'}
                        </Text>

                        <Pressable
                            style={styles.arrowButton}
                            onPress={() => {
                                const currentIndex = rooms.findIndex(room => room.id === selectedRoomForRadiator);
                                const nextIndex = currentIndex < rooms.length - 1 ? currentIndex + 1 : 0;
                                setSelectedRoomForRadiator(rooms[nextIndex]?.id || null);
                            }}
                        >
                            <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
                        </Pressable>
                    </View>

                    <Text style={[styles.addRoomModalLabel, isDark && styles.addRoomModalLabelDark, themeStyles.textMedium]}>
                        Nom du radiateur
                    </Text>
                    <TextInput
                        style={[styles.addRoomModalInput, isDark && styles.addRoomModalInputDark]}
                        value={newRadiatorName}
                        onChangeText={setNewRadiatorName}
                        placeholder="Entrez le nom du radiateur"
                        placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
                    />
                    <Pressable
                        style={[
                            styles.addRoomModalButton,
                            isDark && styles.addRoomModalButtonDark,
                            (!newRadiatorName.trim() || !selectedRoomForRadiator) && styles.addRoomModalButtonDisabled
                        ]}
                        onPress={handleAddRadiator}
                        disabled={!newRadiatorName.trim() || !selectedRoomForRadiator}
                    >
                        <Text style={[
                            styles.addRoomModalButtonText,
                            isDark && styles.addRoomModalButtonTextDark,
                            (!newRadiatorName.trim() || !selectedRoomForRadiator) && styles.addRoomModalButtonTextDisabled,
                            themeStyles.textMedium
                        ]}>
                            Ajouter
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    </View>
</Modal>






      <Modal
        isVisible={isAddRoomModalVisible}
        onBackdropPress={() => setIsAddRoomModalVisible(false)}
        onBackButtonPress={() => setIsAddRoomModalVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.addRoomModal, isDark && styles.addRoomModalDark]}>
          <View style={styles.addRoomModalHeader}>
            <Text style={[styles.addRoomModalTitle, isDark && styles.addRoomModalTitleDark, themeStyles.textSemiBold]}>
              Ajouter une pièce
            </Text>
            <Pressable onPress={() => setIsAddRoomModalVisible(false)}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={styles.addRoomModalContent}>
            <Text style={[styles.addRoomModalLabel, isDark && styles.addRoomModalLabelDark, themeStyles.textMedium]}>
              Nom de la pièce
            </Text>
            <TextInput
              style={[styles.addRoomModalInput, isDark && styles.addRoomModalInputDark]}
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="Entrez le nom de la pièce"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
            />
            <Pressable
              style={[
                styles.addRoomModalButton,
                isDark && styles.addRoomModalButtonDark,
                !newRoomName.trim() && styles.addRoomModalButtonDisabled
              ]}
              onPress={handleAddRoom}
              disabled={!newRoomName.trim()}
            >
              <Text style={[
                styles.addRoomModalButtonText,
                isDark && styles.addRoomModalButtonTextDark,
                !newRoomName.trim() && styles.addRoomModalButtonTextDisabled,
                themeStyles.textMedium
              ]}>
                Ajouter
              </Text>
            </Pressable>
          </View>

        </View>
      </Modal>

      <Modal
        isVisible={isRoomSettingsModalVisible}
        onBackdropPress={() => setIsRoomSettingsModalVisible(false)}
        onBackButtonPress={() => setIsRoomSettingsModalVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.roomSettingsModal, isDark && styles.roomSettingsModalDark]}>
          <View style={styles.roomSettingsModalHeader}>
            <Text style={[styles.roomSettingsModalTitle, isDark && styles.roomSettingsModalTitleDark, themeStyles.textSemiBold]}>
              Paramètres de la pièce
            </Text>
            <Pressable onPress={() => setIsRoomSettingsModalVisible(false)}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={styles.roomSettingsModalContent}>
            <Text style={[styles.roomSettingsModalSubtitle, isDark && styles.roomSettingsModalSubtitleDark, themeStyles.textMedium]}>
              {selectedRoom?.name}
            </Text>
            <Pressable
              style={[styles.deleteRoomButton, isDark && styles.deleteRoomButtonDark]}
              onPress={() => setIsDeleteRoomConfirmationVisible(true)}
            >
              <Text style={[styles.deleteRoomButtonText, isDark && styles.deleteRoomButtonTextDark, themeStyles.textMedium]}>
                Supprimer la pièce
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={isDeleteRoomConfirmationVisible}
        onBackdropPress={() => setIsDeleteRoomConfirmationVisible(false)}
        onBackButtonPress={() => setIsDeleteRoomConfirmationVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.confirmationModal, isDark && styles.confirmationModalDark]}>
          <Text style={[styles.confirmationTitle, isDark && styles.confirmationTitleDark, themeStyles.textSemiBold]}>
            Supprimer la pièce ?
          </Text>
          <Text style={[styles.confirmationText, isDark && styles.confirmationTextDark, themeStyles.text]}>
            Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cette pièce et tous ses radiateurs ?
          </Text>
          <View style={styles.confirmationButtons}>
            <Pressable
              style={[styles.confirmationButton, styles.cancelButton, isDark && styles.cancelButtonDark]}
              onPress={() => setIsDeleteRoomConfirmationVisible(false)}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.cancelButtonText,
                isDark && styles.cancelButtonTextDark,
                themeStyles.textMedium
              ]}>
                Annuler
              </Text>
            </Pressable>
            <Pressable
              style={[styles.confirmationButton, styles.deleteConfirmButton, isDark && styles.deleteConfirmButtonDark]}
              onPress={handleDeleteRoom}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.deleteConfirmButtonText,
                isDark && styles.deleteConfirmButtonTextDark,
                themeStyles.textMedium
              ]}>
                Supprimer
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={isRadiatorSettingsModalVisible}
        onBackdropPress={() => setIsRadiatorSettingsModalVisible(false)}
        onBackButtonPress={() => setIsRadiatorSettingsModalVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.radiatorSettingsModal, isDark && styles.radiatorSettingsModalDark]}>
          <View style={styles.radiatorSettingsModalHeader}>
            <Text style={[styles.radiatorSettingsModalTitle, isDark && styles.radiatorSettingsModalTitleDark, themeStyles.textSemiBold]}>
              Paramètres du radiateur
            </Text>
            <Pressable onPress={() => setIsRadiatorSettingsModalVisible(false)}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <View style={styles.radiatorSettingsModalContent}>
            <Text style={[styles.radiatorSettingsModalSubtitle, isDark && styles.radiatorSettingsModalSubtitleDark, themeStyles.textMedium]}>
              Déplacer vers une autre pièce
            </Text>

            <View style={styles.zoneNavigation}>
              <Pressable
                style={[styles.zoneNavigationButton, isDark && styles.zoneNavigationButtonDark]}
                onPress={() => {
                  if (selectedRadiator) {
                    const availableRooms = rooms.filter(r => r.id !== selectedRadiator.roomId);
                    const currentIndex = availableRooms.findIndex(r => r.id === selectedZoneForMove);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableRooms.length - 1;
                    setSelectedZoneForMove(availableRooms[prevIndex]?.id || null);
                  }
                }}
              >
                <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
              </Pressable>

              <View style={[styles.zoneSelector, isDark && styles.zoneSelectorDark]}>
                <Text style={[styles.zoneText, isDark && styles.zoneTextDark, themeStyles.textSemiBold]}>
                  {selectedZoneForMove !== null
                    ? rooms.find(r => r.id === selectedZoneForMove)?.name
                    : 'Aucune pièce disponible'}
                </Text>
              </View>

              <Pressable
                style={[styles.zoneNavigationButton, isDark && styles.zoneNavigationButtonDark]}
                onPress={() => {
                  if (selectedRadiator) {
                    const availableRooms = rooms.filter(r => r.id !== selectedRadiator.roomId);
                    const currentIndex = availableRooms.findIndex(r => r.id === selectedZoneForMove);
                    const nextIndex = currentIndex < availableRooms.length - 1 ? currentIndex + 1 : 0;
                    setSelectedZoneForMove(availableRooms[nextIndex]?.id || null);
                  }
                }}
              >
                <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.moveButton, isDark && styles.moveButtonDark]}
              onPress={handleMoveRadiator}
            >
              <Text style={[styles.moveButtonText, isDark && styles.moveButtonTextDark, themeStyles.textMedium]}>
                Déplacer
              </Text>
            </Pressable>

            <Pressable
              style={[styles.deleteRadiatorButton, isDark && styles.deleteRadiatorButtonDark]}
              onPress={() => setIsDeleteRadiatorConfirmationVisible(true)}
            >
              <Text style={[styles.deleteRadiatorButtonText, isDark && styles.deleteRadiatorButtonTextDark, themeStyles.textMedium]}>
                Supprimer le radiateur
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={isDeleteRadiatorConfirmationVisible}
        onBackdropPress={() => setIsDeleteRadiatorConfirmationVisible(false)}
        onBackButtonPress={() => setIsDeleteRadiatorConfirmationVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
      >
        <View style={[styles.confirmationModal, isDark && styles.confirmationModalDark]}>
          <Text style={[styles.confirmationTitle, isDark && styles.confirmationTitleDark, themeStyles.textSemiBold]}>
            Supprimer le radiateur ?
          </Text>
          <Text style={[styles.confirmationText, isDark && styles.confirmationTextDark, themeStyles.text]}>
            Cette action est irréversible. Êtes-vous sûr de vouloir supprimer ce radiateur ?
          </Text>
          <View style={styles.confirmationButtons}>
            <Pressable
              style={[styles.confirmationButton, styles.cancelButton, isDark && styles.cancelButtonDark]}
              onPress={() => setIsDeleteRadiatorConfirmationVisible(false)}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.cancelButtonText,
                isDark && styles.cancelButtonTextDark,
                themeStyles.textMedium
              ]}>
                Annuler
              </Text>
            </Pressable>

            <Pressable
              style={[styles.confirmationButton, styles.deleteConfirmButton, isDark && styles.deleteConfirmButtonDark]}
              onPress={handleDeleteRadiator}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.deleteConfirmButtonText,
                isDark && styles.deleteConfirmButtonTextDark,
                themeStyles.textMedium
              ]}>
                Supprimer
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

<Modal
    isVisible={isModeModalVisible}
    onBackdropPress={() => {
        setIsModeModalVisible(false);
        setSelectedRadiator(null);
    }}
    onBackButtonPress={() => {
        setIsModeModalVisible(false);
        setSelectedRadiator(null);
    }}
    useNativeDriver
    hideModalContentWhileAnimating
    style={styles.modal}
>
    <View style={[styles.modeModal, isDark && styles.modeModalDark]}>
        <View style={styles.modeModalHeader}>
            <Text style={[styles.modeModalTitle, isDark && styles.modeModalTitleDark, themeStyles.textSemiBold]}>
                Choisir le mode
            </Text>
            <Pressable
                onPress={() => {
                    setIsModeModalVisible(false);
                    setSelectedRadiator(null);
                }}
                style={styles.closeButton}
            >
                <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
        </View>
        <View style={styles.modeGrid}>
            {modes.map(mode => (
                <Pressable
                    key={mode.id}
                    style={[
                        styles.modeOption,
                        { backgroundColor: mode.color + '20' }
                    ]}
                    onPress={() => {
                        if (selectedRadiator) {
                            handleChangeRadiatorMode(selectedRadiator.radiatorId, mode.id);  // ✅ Mise à jour directe
                        }
                    }}
                >
                    <Text
                        style={[
                            styles.modeOptionText,
                            { color: mode.color },
                            themeStyles.textMedium
                        ]}
                    >
                        {mode.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    </View>
</Modal>
<Modal
  isVisible={isEspConnectingModalVisible}
  backdropOpacity={0.4}
  animationIn="fadeIn"
  animationOut="fadeOut"
  useNativeDriver
  hideModalContentWhileAnimating
  style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
>
  <LoadingModalModule title="Connexion au module..." />
</Modal>



<CustomAlertModal
  isVisible={isCustomAlertVisible}
  onClose={() => setIsCustomAlertVisible(false)}
  message={customAlertMessage || "Veuillez ajouter une pièce avant d'ajouter un radiateur."}
/>

    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#03082F',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: 100,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  roomContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  roomContainerDark: {
    backgroundColor: '#03082F',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  roomHeaderDark: {
    backgroundColor: '#03082F',
    borderBottomColor: '#ffffff20',
  },
  roomTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    color: '#03082F',
    marginLeft: 8,
  },
  roomNameDark: {
    color: '#ffffff',
  },
  roomHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  programMode: {
    fontSize: 14,
    color: '#03082F80',
  },
  programModeDark: {
    color: '#ffffff80',
  },
  programModeActive: {
    color: '#03082F',
    backgroundColor: '#03082F20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  programModeActiveDark: {
    color: '#ffffff',
    backgroundColor: '#ffffff20',
  },
  roomSettingsButton: {
    padding: 4,
  },
  radiatorsList: {
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  radiatorsListDark: {
    backgroundColor: '#03082F',
  },
  radiatorCard: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      web: {
        elevation: 1,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  radiatorCardDark: {
    backgroundColor: '#ffffff05',
  },
  radiatorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiatorName: {
    fontSize: 16,
    color: '#03082F',
  },
  radiatorNameDark: {
    color: '#ffffff',
  },
  radiatorTemp: {
    fontSize: 20,
    color: '#03082F',
  },
  radiatorTempDark: {
    color: '#ffffff',
  },
  modeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  modeText: {
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#03082F',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        elevation: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  fabDark: {
    backgroundColor: '#ffffff',
  },
  fabMenuModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  fabMenuContainer: {
    backgroundColor: 'transparent',
    padding: 20,
    paddingBottom: 96,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  fabMenuItemDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  fabMenuItemText: {
    fontSize: 16,
    color: '#03082F',
  },
  fabMenuItemTextDark: {
    color: '#ffffff',
  },
  modal: {
    margin: 20,
  },
  addRoomModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  addRoomModalDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  addRoomModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addRoomModalTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  addRoomModalTitleDark: {
    color: '#ffffff',
  },
  addRoomModalContent: {
    gap: 16,
  },
  addRoomModalLabel: {
    fontSize: 14,
    color: '#03082F80',
  },
  addRoomModalLabelDark: {
    color: '#ffffff80',
  },
  addRoomModalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#03082F20',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#03082F',
    backgroundColor: '#ffffff',
  },
  addRoomModalInputDark: {
    borderColor: '#ffffff20',
    color: '#ffffff',
    backgroundColor: '#ffffff05',
  },
  addRoomModalButton: {
    height: 48,
    backgroundColor: '#03082F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRoomModalButtonDark: {
    backgroundColor: '#ffffff',
  },
  addRoomModalButtonDisabled: {
    opacity: 0.5,
  },
  addRoomModalButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  addRoomModalButtonTextDark: {
    color: '#03082F',
  },
  addRoomModalButtonTextDisabled: {
    opacity: 0.5,
  },
  roomSettingsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  roomSettingsModalDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  roomSettingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  roomSettingsModalTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  roomSettingsModalTitleDark: {
    color: '#ffffff',
  },
  roomSettingsModalContent: {
    gap: 16,
  },
  roomSettingsModalSubtitle: {
    fontSize: 16,
    color: '#03082F80',
    textAlign: 'center',
  },
  roomSettingsModalSubtitleDark: {
    color: '#ffffff80',
  },
  deleteRoomButton: {
    height: 48,
    backgroundColor: '#D32F2F20',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteRoomButtonDark: {
    backgroundColor: '#D32F2F20',
  },
  deleteRoomButtonText: {
    fontSize: 16,
    color: '#D32F2F',
  },
  deleteRoomButtonTextDark: {
    color: '#D32F2F',
  },
  radiatorSettingsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  radiatorSettingsModalDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  radiatorSettingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  radiatorSettingsModalTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  radiatorSettingsModalTitleDark: {
    color: '#ffffff',
  },
  radiatorSettingsModalContent: {
    gap: 16,
  },
  radiatorSettingsModalSubtitle: {
    fontSize: 16,
    color: '#03082F80',
  },
  radiatorSettingsModalSubtitleDark: {
    color: '#ffffff80',
  },
  zoneNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneNavigationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  zoneNavigationButtonDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  zoneSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  zoneSelectorDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  zoneText: {
    fontSize: 16,
    color: '#03082F',
  },
  zoneTextDark: {
    color: '#ffffff',
  },
  moveButton: {
    height: 48,
    backgroundColor: '#03082F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveButtonDark: {
    backgroundColor: '#ffffff',
  },
  moveButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  moveButtonTextDark: {
    color: '#03082F',
  },
  deleteRadiatorButton: {
    height: 48,
    backgroundColor: '#D32F2F20',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteRadiatorButtonDark: {
    backgroundColor: '#D32F2F20',
  },
  deleteRadiatorButtonText: {
    fontSize: 16,
    color: '#D32F2F',
  },
  deleteRadiatorButtonTextDark: {
    color: '#D32F2F',
  },
  confirmationModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  confirmationModalDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  confirmationTitle: {
    fontSize: 18,
    color: '#03082F',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationTitleDark: {
    color: '#ffffff',
  },
  confirmationText: {
    fontSize: 16,
    color: '#03082F80',
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmationTextDark: {
    color: '#ffffff80',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#03082F10',
  },
  cancelButtonDark: {
    backgroundColor: '#ffffff10',
  },
  deleteConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  deleteConfirmButtonDark: {
    backgroundColor: '#D32F2F',
  },
  confirmationButtonText: {
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#03082F',
  },
  cancelButtonTextDark: {
    color: '#ffffff',
  },
  deleteConfirmButtonText: {
    color: '#ffffff',
  },
  deleteConfirmButtonTextDark: {
    color: '#ffffff',
  },
  modeModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      },
    }),
  },
  modeModalDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  modeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modeModalTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  modeModalTitleDark: {
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  modeGrid: {
    gap: 12,
  },
  modeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  modeOptionText: {
    fontSize: 14,
  },
  roomSelectionContainer: {
      flexDirection: 'row', // ➤ Affichage en ligne
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
      ...Platform.select({
          web: {
              elevation: 2,
          },
          default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
          },
      }),
  },
  roomSelectionContainerDark: {
      backgroundColor: '#03082F',

  },
  arrowButton: {
      padding: 8,
  },
  arrowButtonDark: {
      backgroundColor: '#03082F',
      borderWidth: 1,
      borderColor: '#ffffff20',
      borderRadius: 8,
  },
  roomNameText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      color: '#03082F',
  },
  roomNameTextDark: {
      color: '#ffffff',
  },
fabMenuItemDisabled: {
    opacity: 0.5,       // ✅ Rend le bouton visuellement "grisé"
},
wifiItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
},
wifiItemSelected: {
    backgroundColor: '#ddd',
},
wifiName: {
    fontSize: 16,
    color: '#03082F',
},

wifiNameDark: {
  color: '#ffffff',
},

radiatorHumidity: {
  fontSize: 16,
  color: '#03082F',
  marginTop: 4,
},
radiatorHumidityDark: {
  color: '#ffffff',
},

});