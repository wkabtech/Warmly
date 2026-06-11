import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SettingsButton } from '../../components/SettingsButton';
import { Logo } from '../../components/Logo';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../utils/api'; // Assure toi que ton api.ts est bien configuré pour axios
import { LoadingScreen } from '../../components/LoadingScreen';
import { PullToRefresh } from '../../components/PullToRefresh';


export default function DashboardScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const router = useRouter();
  const [rooms, setRooms] = useState<Array<{ name: string; temp: string; humidite: string }>>([]);
const [isLoading, setIsLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);


  const [averageTemp, setAverageTemp] = useState<number | null>(null);
  const [averageHumidity, setAverageHumidity] = useState<number | null>(null);
const [showHumidity, setShowHumidity] = useState(false);

const toggleView = () => {
  setShowHumidity(!showHumidity);
};

const fetchRooms = async () => {
  const MIN_LOADING_TIME = 1000; // 1 seconde minimum
  const start = Date.now();

  try {
    setIsLoading(true);

    const piecesResponse = await api.get('pieces.php?action=lister');
    const pieces = piecesResponse.data.pieces || [];

    const radiateursResponse = await api.get('radiateurs.php?action=lister');
    const radiateurs = radiateursResponse.data.radiateurs || [];

const fetchedRooms = pieces.map((piece: any) => {
  const radiateursForPiece = radiateurs.filter(
    (radiateur: any) => radiateur.piece_nom === piece.nom
  );

  // 🔍 Log des valeurs pour vérifier le format

  const validTemps = radiateursForPiece
    .map((r: any) => {
      return r.temperature;
    })
    .filter((t: any) => t !== null && t !== 'N/A');

  const validHumidities = radiateursForPiece
    .map((r: any) => {
      return r.humidite;
    })
    .filter((h: any) => h !== null && h !== 'N/A');

  let tempDisplay = 'N/A';
  let humidityDisplay = 'N/A';

  if (validTemps.length > 0) {
    const sum = validTemps.reduce((acc: number, curr: any) => {
      const parsedValue = parseFloat(curr);
      return acc + parsedValue;
    }, 0);
    const average = sum / validTemps.length;
    tempDisplay = `${average.toFixed(1)}°C`;
  }

  if (validHumidities.length > 0) {
    const sum = validHumidities.reduce((acc: number, curr: any) => {
      const parsedValue = parseFloat(curr);
      return acc + parsedValue;
    }, 0);
    const average = sum / validHumidities.length;
    humidityDisplay = `${average.toFixed(1)}%`;
  }

  return {
    name: piece.nom,
    temp: tempDisplay,
    humidite: humidityDisplay,
  };
});



    setRooms(fetchedRooms);

    const validTempsGlobal = fetchedRooms
      .map(room => parseFloat(room.temp))
      .filter(temp => !isNaN(temp));

    if (validTempsGlobal.length > 0) {
      const sum = validTempsGlobal.reduce((acc, curr) => acc + curr, 0);
      const average = sum / validTempsGlobal.length;
      setAverageTemp(average);
    } else {
      setAverageTemp(null);
    }
const validHumidityGlobal = fetchedRooms
  .map(room => parseFloat(room.humidite))
  .filter(humidite => !isNaN(humidite));

if (validHumidityGlobal.length > 0) {
  const sum = validHumidityGlobal.reduce((acc, curr) => acc + curr, 0);
  const average = sum / validHumidityGlobal.length;
  setAverageHumidity(average);
} else {
  setAverageHumidity(null);
}
  } catch (error) {
    console.error('Erreur lors de la récupération des pièces:', error);
  } finally {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  }
};


const onRefresh = async () => {
  setRefreshing(true);
  await fetchRooms();
  setRefreshing(false);
};


useEffect(() => {
  fetchRooms();
}, []);


const getTemperatureMood = (temp: number) => {
  if (temp >= 18 && temp <= 21) {
    return {
      emoji: '😊',
      label: 'Température idéale',
      color: '#4CAF50',
    };
  }
  if ((temp >= 16 && temp < 18) || (temp > 21 && temp <= 24)) {
    return {
      emoji: '😐',
      label: 'Température acceptable',
      color: '#FF9800',
    };
  }
  return {
    emoji: '😕',
    label: 'Température inconfortable',
    color: '#D32F2F',
  };
};

const getHumidityMood = (humidity: number) => {
  if (humidity >= 40 && humidity <= 60) {
    return {
      emoji: '😊',
      label: 'Humidité idéale',
      color: '#4CAF50',
    };
  }
  if ((humidity >= 30 && humidity < 40) || (humidity > 60 && humidity <= 70)) {
    return {
      emoji: '😐',
      label: 'Humidité acceptable',
      color: '#FF9800',
    };
  }
  return {
    emoji: '😕',
    label: 'Humidité     inconfortable',
    color: '#D32F2F',
  };
};


  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'comfort':
        return '#FF9800'; // Orange chaud
      case 'eco':
        return '#4CAF50'; // Vert doux
      case 'frost':
        return '#00A8E8'; // Bleu clair
      case 'off':
        return '#D32F2F'; // Rouge
      default:
        return '#FF9800'; // Par défaut: Confort
    }
  };

  const getModeName = (mode: string) => {
    switch (mode) {
      case 'comfort':
        return 'Confort';
      case 'eco':
        return 'Éco';
      case 'frost':
        return 'Hors-gel';
      case 'off':
        return 'Arrêt';
      default:
        return 'Confort';
    }
  };

  const mood = averageTemp !== null ? getTemperatureMood(averageTemp) : { emoji: null, label: 'Aucune température', color: '#aaaaaa' };

if (isLoading) {
  return <LoadingScreen />;
}

return (
<PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
  <View style={[styles.container, isDark && styles.containerDark]}>
    <ThemeToggle />
    <SettingsButton />
    <View style={styles.header}>
      <Logo />
    </View>

<View style={[styles.mainCard, isDark && styles.mainCardDark]}>
  <View style={styles.mainCardContent}>
    <View style={[
      styles.moodContainer,
      { backgroundColor: isDark ? '#ffffff10' : '#00000005' }
    ]}>
      <Text style={styles.moodEmoji}>
        {
          showHumidity
            ? averageHumidity !== null ? getHumidityMood(averageHumidity).emoji : ''
            : mood.emoji
        }
      </Text>
    </View>
    <Text style={[styles.mainTemp, isDark && styles.mainTempDark, themeStyles.textBold]}>
      {
        showHumidity
          ? averageHumidity !== null ? `${averageHumidity.toFixed(1)}%` : 'N/A'
          : averageTemp !== null ? `${averageTemp.toFixed(1)}°C` : 'N/A'
      }
    </Text>
    <Text style={[
      styles.mainLabel,
      { color: showHumidity ? getHumidityMood(averageHumidity || 0).color : mood.color },
      themeStyles.textMedium
    ]}>
      {showHumidity
        ? averageHumidity !== null
          ? getHumidityMood(averageHumidity).label
          : 'Aucune donnée'
        : mood.label
      }
    </Text>
  </View>
</View>



    <View style={styles.roomsSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark, themeStyles.textSemiBold]}>
          Aperçu des pièces
        </Text>
<Pressable onPress={toggleView}>
  <Text style={[styles.seeAll, isDark && styles.seeAllDark, themeStyles.textMedium]}>
    {showHumidity ? "Voir température" : "Voir humidité"}
  </Text>
</Pressable>

      </View>

      {rooms.length === 0 && (
        <View style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 60,
            padding: 70,
            borderRadius: 12
          },
          { backgroundColor: isDark ? '#03082F' : '#ffffff' }
        ]}>
          <Text style={[
            {
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 20,
              color: isDark ? '#ffffff' : '#03082F'
            },
            themeStyles.textMedium
          ]}>
            Vous n'avez pas de pièces. Veuillez en ajouter.
          </Text>
          <Pressable onPress={() => router.push('/(tabs)')}>
            <Text style={[
              {
                fontSize: 18,
                textAlign: 'center',
                color: isDark ? '#ffffff' : '#03082F',
              },
              themeStyles.textBold
            ]}>
              Ajouter une pièce
            </Text>
          </Pressable>
        </View>
      )}

<View style={styles.roomsGrid}>
  {rooms.map((room, index) => (
    <View
      key={index}
      style={[styles.roomCard, isDark && styles.roomCardDark]}
    >
      <Text style={[styles.roomName, isDark && styles.roomNameDark, themeStyles.textMedium]}>
        {room.name}
      </Text>
      <View style={styles.roomTemp}>
        <Text style={[styles.tempValue, isDark && styles.tempValueDark, themeStyles.textBold]}>
          {showHumidity ? room.humidite : room.temp}
        </Text>

        {(() => {
          const value = showHumidity ? room.humidite : room.temp;
          if (value === 'N/A') {
            return (
              <View style={styles.modeInfo}>
                <Text style={[
                  styles.modeText,
                  { color: isDark ? '#aaaaaa' : '#555555', textAlign: 'center' },
                  themeStyles.textMedium
                ]}>
                  Aucune donnée
                </Text>
              </View>
            );
          }

if (!showHumidity) {
  const roomMood = getTemperatureMood(parseFloat(room.temp));
  return (
    <View style={styles.modeInfo}>
      <View style={styles.moodIndicator}>
        <Text style={styles.moodEmojiSmall}>{roomMood.emoji}</Text>
      </View>
      <Text style={[
        styles.modeText,
        { color: roomMood.color },
        themeStyles.textMedium
      ]}>
        {roomMood.label}
      </Text>
    </View>
  );
} else {
  // 🔎 Calcul de l'humidité pour la pièce
  const roomHumidityMood = getHumidityMood(parseFloat(room.humidite));
  return (
    <View style={styles.modeInfo}>
      <View style={styles.moodIndicator}>
        <Text style={styles.moodEmojiSmall}>{roomHumidityMood.emoji}</Text>
      </View>
      <Text style={[
        styles.modeText,
        { color: roomHumidityMood.color },
        themeStyles.textMedium
      ]}>
        {roomHumidityMood.label}
      </Text>
    </View>
  );
}

        })()}
      </View>
    </View>
  ))}
</View>

    </View>
    </View>
  </PullToRefresh>
); // <== Fermeture du return
} // <== Fermeture de la fonction DashboardScreen


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#03082F',
  },
  header: {
    height: 100,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainCardDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  mainCardContent: {
    alignItems: 'center',
  },
  moodContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodEmoji: {
    fontSize: 40,
  },
  mainTemp: {
    fontSize: 48,
    color: '#03082F',
    marginBottom: 8,
  },
  mainTempDark: {
    color: '#ffffff',
  },
  mainLabel: {
    fontSize: 16,
  },
  roomsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  seeAll: {
    fontSize: 14,
    color: '#03082F80',
  },
  seeAllDark: {
    color: '#ffffff80',
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  roomCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  roomCardDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  roomName: {
    fontSize: 14,
    color: '#03082F',
    marginBottom: 12,
  },
  roomNameDark: {
    color: '#ffffff',
  },
  roomTemp: {
    alignItems: 'center',
    gap: 8,
  },
  tempValue: {
    fontSize: 24,
    color: '#03082F',
  },
  tempValueDark: {
    color: '#ffffff',
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 12,
    color: '#03082F80',
  },
  modeTextDark: {
    color: '#ffffff80',
  },
  moodIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmojiSmall: {   // 🔥 nouveau
    fontSize: 14,
  },
});