import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { Calendar, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SettingsButton } from '../../components/SettingsButton';
import { Logo } from '../../components/Logo';
import { useTheme } from '../../context/ThemeContext';
import { useState } from 'react';
import { format, addDays, addWeeks, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WeekCalendar } from '../../components/WeekCalendar';
import Modal from 'react-native-modal';
import { ScheduleSelectionModal } from '../../components/ScheduleSelectionModal';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useEffect, useRef } from 'react';
import { LoadingScreen } from '../../components/LoadingScreen';
import api from '../../utils/api';
import { PullToRefresh } from '../../components/PullToRefresh';






const SCREEN_WIDTH = Dimensions.get('window').width;
const HEADER_HEIGHT = 100;
const TIME_SLOT_HEIGHT = 40;
const HOUR_LABEL_WIDTH = 50;
const DAY_HEADER_HEIGHT = 60;

type Mode = 'comfort' | 'eco' | 'frost' | 'off';

interface TimeSlot {
  id: string;
  room: string;
  roomId: number;
  weekStart: Date;
  day: number;
  startHour: number;
  endHour: number;
  mode: Mode | null;
}


interface Room {
  id: number;
  name: string;
}

const modes = [
  { id: 'comfort', label: 'Confort', color: '#FF9800' },
  { id: 'eco', label: 'Éco', color: '#4CAF50' },
  { id: 'frost', label: 'Hors-Gel', color: '#00A8E8' },
  { id: 'off', label: 'Arrêt', color: '#D32F2F' },
];


export default function ScheduleScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { locale: fr }));
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [isWeekSelectorVisible, setIsWeekSelectorVisible] = useState(false);
  const [isModeModalVisible, setIsModeModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode | 'delete' | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Nouveau state pour stocker les pièces dynamiques


  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
const selectedRoomRef = useRef<Room | null>(null);

useEffect(() => {
  if (selectedRoom) {
    selectedRoomRef.current = selectedRoom;
  }
}, [selectedRoom]);


useEffect(() => {
  if (selectedRoom) {
  } else {
    setIsLoading(false); // sécurité si pas de pièce sélectionnée
  }
}, [selectedRoom, currentWeek]);


const onRefresh = async () => {
  setIsLoading(true);  // 🔥 affiche LoadingScreen

  const MIN_LOADING_TIME = 1000;
  const start = Date.now();

  await fetchRooms(); // ou fetchAllData() si tu veux d'autres fetch

  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

  setTimeout(() => {
    setIsLoading(false);
  }, remaining);
};



  const handleGridPress = (day: number, hour: number) => {
    setSelectedSlot({ day, hour });
    setIsModeModalVisible(true);
  };

const previousRoomId = selectedRoom?.id;

// Fonction pour récupérer les pièces depuis l'API
const fetchRooms = async () => {
  setIsLoading(true); // 🔥 important !

  try {
    const { data } = await api.get('pieces.php?action=lister');
    if (data.success) {
      const fetchedRooms: Room[] = data.pieces.map((p: any) => ({
        id: parseInt(p.id),
        name: p.nom,
      }));

      setRooms(fetchedRooms);

      let selected: Room | null = null;
      const previous = selectedRoomRef.current;
      const match = fetchedRooms.find(r => r.id === previous?.id);

      if (match) {
        selected = match;
      } else if (fetchedRooms.length > 0) {
        selected = fetchedRooms[0];
      }

      if (selected) {
        setSelectedRoom(selected);
        await fetchSchedule(selected); // ✅ appel avec argument ici
      } else {
        setSelectedRoom(null);
        setIsLoading(false); // aucune pièce
      }
    } else {
      setIsLoading(false); // erreur côté API
    }
  } catch (error) {
    console.error("Erreur lors du chargement des pièces :", error);
    setIsLoading(false); // erreur réseau
  }
};




useFocusEffect(
  useCallback(() => {
    if (rooms.length === 0) {
      fetchRooms(); // ⚡ Seulement si vide
    }
  }, [rooms.length])
);









const saveSchedule = async () => {
  const transformed = timeSlots.map(slot => {
    const fullDate = new Date(slot.weekStart);
    fullDate.setDate(fullDate.getDate() + slot.day);
    fullDate.setHours(slot.startHour, 0, 0, 0);

    return {
      piece_id: slot.roomId,
      date_heure: fullDate.toISOString(),
      mode: convertModeToDB(slot.mode || '')
    };
  });

  try {
    const response = await api.post('programmation.php', { timeSlots: transformed });

    console.log('[✅ RÉPONSE API]', response.data);

    if (response.data.status === 'success') {
      alert('Programmation enregistrée avec succès !');
    } else {
      alert('Erreur lors de l\'enregistrement.');
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde :', error);
    alert('Erreur de connexion à l\'API.');
  }
};



const convertModeToDB = (mode: string): string => {
  switch (mode) {
    case 'comfort':
      return 'confort';
    case 'eco':
      return 'eco';
    case 'frost':
      return 'hors-gel';
    case 'off':
      return 'arret';
    default:
      return mode; // fallback au cas où
  }
};


const saveScheduleWith = async (slots: TimeSlot[]) => {
  const transformed = slots.map(slot => {
    const fullDate = new Date(slot.weekStart);
    fullDate.setDate(fullDate.getDate() + slot.day);
    fullDate.setHours(slot.startHour, 0, 0, 0);

    return {
      piece_id: slot.roomId,
      date_heure: fullDate.toISOString(),
      mode: convertModeToDB(slot.mode || ''),
    };
  });

  console.log('[🛰️ ENVOI À API]', JSON.stringify({ timeSlots: transformed }, null, 2));

  try {
    const response = await api.post('programmation.php', { timeSlots: transformed }, {
      headers: {
        'Content-Type': 'application/json', // 🚨 Important
      },
    });

    console.log('[✅ RÉPONSE API]', response.data);

    if (response.data.status !== 'success') {
      console.error('[❌ API ERROR]', response.data);
    }
  } catch (error) {
    console.error('[❌ API ERROR]', error);
  }
};




const fetchSchedule = async (room: Room) => {
  console.log('[👀 FETCH POUR ROOM]', room);
  setIsLoading(true); // 🔁 au cas où on change de pièce

  try {
    const { data } = await api.get('programmation.php?action=lister');
    if (data.success) {
      const fetchedSlots: TimeSlot[] = data.slots.map((s: any) => ({
        id: s.id.toString(),
        room: s.room,
        roomId: parseInt(s.piece_id),
        weekStart: new Date(s.week_start),
        day: parseInt(s.day),
        startHour: parseInt(s.hour),
        endHour: parseInt(s.hour) + 1,
        mode:
          s.mode === 'confort'
            ? 'comfort'
            : s.mode === 'eco'
            ? 'eco'
            : s.mode === 'hors-gel'
            ? 'frost'
            : s.mode === 'arret'
            ? 'off'
            : null,
      }));

      console.log('[✅ SLOTS REÇUS]', fetchedSlots);
      setTimeSlots(fetchedSlots);
    } else {
      console.warn('[⚠️ ERREUR API SLOTS]', data);
    }
  } catch (error) {
    console.error('[❌ FETCH SLOTS FAILED]', error);
  } finally {
    setIsLoading(false); // 🟢 toujours désactiver après
  }
};






const deleteScheduleFor = async (slots: TimeSlot[]) => {
  const transformed = slots.map(slot => {
    const fullDate = new Date(slot.weekStart);
    fullDate.setDate(fullDate.getDate() + slot.day);
    fullDate.setHours(slot.startHour, 0, 0, 0);

    return {
      piece_id: slot.roomId,
      date_heure: fullDate.toISOString(),
    };
  });

  try {
    const response = await api.post('programmation.php?action=supprimer',
      { timeSlots: transformed },
      { headers: { 'Content-Type': 'application/json' } } // ✅ ici
    );
    console.log('[🗑️ SUPPRESSION]', response.data);
  } catch (error) {
    console.error('[❌ SUPPRESSION ÉCHOUÉE]', error);
  }
};






const handleModeSelect = async (mode: Mode | 'delete') => {
  if (!selectedSlot || !selectedRoom) return;

  const slotBase: TimeSlot = {
    id: Math.random().toString(),
    room: selectedRoom.name,
    roomId: selectedRoom.id,
    weekStart: currentWeek,
    day: selectedSlot.day,
    startHour: selectedSlot.hour,
    endHour: selectedSlot.hour + 1,
    mode: mode === 'delete' ? null : mode,
  };

  if (mode === 'delete') {
    // 1. MAJ locale immédiate pour fluidité
    setTimeSlots(prev =>
      prev.filter(s =>
        !(
          s.room === slotBase.room &&
          isSameWeek(s.weekStart, slotBase.weekStart, { locale: fr }) &&
          s.day === slotBase.day &&
          s.startHour === slotBase.startHour
        )
      )
    );

deleteScheduleFor([slotBase]); // async mais on attend pas

  } else {
    setTimeSlots(prev => {
      const updated = prev.map(s =>
        s.room === slotBase.room &&
        isSameWeek(s.weekStart, slotBase.weekStart, { locale: fr }) &&
        s.day === slotBase.day &&
        s.startHour === slotBase.startHour
          ? { ...s, mode }
          : s
      );

      const exists = updated.find(s =>
        s.room === slotBase.room &&
        isSameWeek(s.weekStart, slotBase.weekStart, { locale: fr }) &&
        s.day === slotBase.day &&
        s.startHour === slotBase.startHour
      );

      const final = exists ? updated : [...updated, { ...slotBase, mode }];
      saveScheduleWith(final);
      return final;
    });
  }

  setIsModeModalVisible(false);
  setSelectedSlot(null);
  setSelectedMode(null);
};










const deleteMultipleSlots = async (slots: TimeSlot[]) => {
  console.log('🔥 deleteMultipleSlots appelée avec :', slots);

  if (!slots || slots.length === 0) {
    console.warn('⚠️ Aucun slot fourni pour suppression multiple');
    return;
  }

  const transformed = slots.map(slot => {
    const fullDate = new Date(slot.weekStart);
    fullDate.setDate(fullDate.getDate() + slot.day);
    fullDate.setHours(slot.startHour, 0, 0, 0);

    return {
      piece_id: slot.roomId,
      date_heure: fullDate.toISOString(),
    };
  });

  console.log('🛰️ Slots transformés pour deleteMultipleSlots :', JSON.stringify({ timeSlots: transformed }, null, 2));

  try {
    const response = await api.post(
      'programmation.php?action=supprimer',
      { timeSlots: transformed },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[✅ SUPPRESSION MULTI Réponse API]', response.data);
  } catch (error) {
    console.error('[❌ ERREUR suppression multiple]', error);
  }
};





const handleSelectionConfirm = (selection: {
  rooms: string[];
  days: number[];
  startHour: number;
  endHour: number;
  weeks: Date[];
  mode: Mode | 'delete';
}) => {
  const slotsToProcess: TimeSlot[] = [];

  selection.weeks.forEach(weekStart => {
selection.rooms.forEach(room => {
  const roomObj = rooms.find(r => r.name === room);
  if (!roomObj) return;

  selection.days.forEach(day => {
    for (let hour = selection.startHour; hour < selection.endHour; hour++) {
      slotsToProcess.push({
        id: Math.random().toString(),
        room: roomObj.name,
        roomId: roomObj.id, // ✅ AJOUT
        weekStart,
        day,
        startHour: hour,
        endHour: hour + 1,
        mode: selection.mode === 'delete' ? null : (selection.mode as Mode),
      });
    }
  });
});

  });

  if (selection.mode === 'delete') {
    deleteMultipleSlots(slotsToProcess);

    setTimeSlots(prev =>
      prev.filter(existingSlot =>
        !slotsToProcess.some(s =>
          s.room === existingSlot.room &&
          isSameWeek(s.weekStart, existingSlot.weekStart, { locale: fr }) &&
          s.day === existingSlot.day &&
          s.startHour === existingSlot.startHour
        )
      )
    );
  } else {
    saveScheduleWithMultiple(slotsToProcess);

    setTimeSlots(prev => {
      const nonOverlapping = prev.filter(existingSlot =>
        !slotsToProcess.some(s =>
          s.room === existingSlot.room &&
          isSameWeek(s.weekStart, existingSlot.weekStart, { locale: fr }) &&
          s.day === existingSlot.day &&
          s.startHour === existingSlot.startHour
        )
      );
      return [...nonOverlapping, ...slotsToProcess];
    });
  }

  setIsSelectionModalVisible(false);
};


const handleSelectionDelete = (selection: {
  rooms: Room[]; // 🛠️ Correction ici
  days: number[];
  startHour: number;
  endHour: number;
  weeks: Date[];
}) => {
  console.log('🧩 handleSelectionDelete appelé avec :', selection);

  const slotsToDelete: TimeSlot[] = [];

  selection.weeks.forEach(weekStart => {
    selection.rooms.forEach(roomObj => { // 🛠️ Correction ici aussi (plus besoin de find)
      selection.days.forEach(day => {
        for (let hour = selection.startHour; hour < selection.endHour; hour++) {
          slotsToDelete.push({
            id: Math.random().toString(),
            room: roomObj.name,   // ✅
            roomId: roomObj.id,    // ✅
            weekStart,
            day,
            startHour: hour,
            endHour: hour + 1,
            mode: null,
          });
        }
      });
    });
  });

  console.log('🛠️ Slots à supprimer :', slotsToDelete);

  if (slotsToDelete.length > 0) {
    deleteMultipleSlots(slotsToDelete);
    setTimeSlots(prev =>
      prev.filter(existingSlot =>
        !slotsToDelete.some(s =>
          s.room === existingSlot.room &&
          isSameWeek(s.weekStart, existingSlot.weekStart, { locale: fr }) &&
          s.day === existingSlot.day &&
          s.startHour === existingSlot.startHour
        )
      )
    );
  } else {
    console.warn('⚠️ Aucun slot à supprimer.');
  }

  setIsSelectionModalVisible(false);
};



const handlePreviousWeek = () => {
  setCurrentWeek(prev => addWeeks(prev, -1));
};

const handleNextWeek = () => {
  setCurrentWeek(prev => addWeeks(prev, 1));
};

const filteredTimeSlots = timeSlots.filter(
  slot =>
    slot.roomId === selectedRoom?.id &&
    format(slot.weekStart, 'yyyy-MM-dd') === format(currentWeek, 'yyyy-MM-dd')
);


const handleWeekSelect = (weekStart: Date) => {
  setCurrentWeek(weekStart);
};





const saveScheduleWithMultiple = async (slots: TimeSlot[]) => {
  const transformed = slots.map(slot => {
    const fullDate = new Date(slot.weekStart);
    fullDate.setDate(fullDate.getDate() + slot.day);
    fullDate.setHours(slot.startHour, 0, 0, 0);

    return {
      piece_id: slot.roomId,
      date_heure: fullDate.toISOString(),
      mode: convertModeToDB(slot.mode || ''),
    };
  });

  console.log('[🛰️ ENVOI MULTIPLE À API]', JSON.stringify({ timeSlots: transformed }, null, 2));

  try {
    const response = await api.post('programmation.php', { timeSlots: transformed }, {
      headers: {
        'Content-Type': 'application/json', // 🚨 Important
      },
    });

    console.log('[✅ MULTI ENREGISTRÉ]', response.data);

    if (response.data.status !== 'success') {
      console.error('[❌ ERREUR MULTI]', response.data);
    }
  } catch (error) {
    console.error('[❌ ERREUR MULTI]', error);
  }
};



if (isLoading) {
  return <LoadingScreen />;
}


  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ThemeToggle />
      <SettingsButton />
      <View style={styles.header}>
        <Logo />
      </View>

      <View style={styles.content}>
        <View style={styles.weekNavigation}>
          <Pressable
            style={[styles.weekNavigationButton, isDark && styles.weekNavigationButtonDark]}
            onPress={handlePreviousWeek}
          >
            <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>

          <Pressable
            style={[styles.weekSelector, isDark && styles.weekSelectorDark]}
            onPress={() => setIsWeekSelectorVisible(true)}
          >
            <Calendar size={20} color={isDark ? '#ffffff' : '#03082F'} />
            <Text style={[styles.weekText, isDark && styles.weekTextDark, themeStyles.textSemiBold]}>
              {format(currentWeek, 'dd MMM', { locale: fr })} - {format(addDays(currentWeek, 6), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.weekNavigationButton, isDark && styles.weekNavigationButtonDark]}
            onPress={handleNextWeek}
          >
            <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>
        </View>

        <View style={styles.roomNavigation}>
          <Pressable
            style={[styles.roomNavigationButton, isDark && styles.roomNavigationButtonDark]}
            onPress={() => {
              const currentIndex = rooms.findIndex(r => r.id === selectedRoom?.id);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : rooms.length - 1;
              setSelectedRoom(rooms[prevIndex]);
            }}
          >
            <ChevronLeft size={24} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>

          <View style={[styles.roomSelector, isDark && styles.roomSelectorDark]}>
<Text style={[styles.roomText, isDark && styles.roomTextDark, themeStyles.textSemiBold]}>
  {rooms.length === 0
    ? 'Aucune pièce'
    : selectedRoom?.name ?? ''}
</Text>

          </View>

          <Pressable
            style={[styles.roomNavigationButton, isDark && styles.roomNavigationButtonDark]}
            onPress={() => {
              const currentIndex = rooms.findIndex(r => r.id === selectedRoom?.id);
              const nextIndex = currentIndex < rooms.length - 1 ? currentIndex + 1 : 0;
              setSelectedRoom(rooms[nextIndex]);
            }}
          >
            <ChevronRight size={24} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>
        </View>

        <View style={[styles.legend, isDark && styles.legendDark]}>
          {modes.map(mode => (
            <View key={mode.id} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: mode.color }]} />
              <Text style={[styles.legendText, isDark && styles.legendTextDark, themeStyles.text]}>
                {mode.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.schedule, isDark && styles.scheduleDark]}>
          <View style={[styles.daysHeader, isDark && styles.daysHeaderDark]}>
            <Pressable
              style={[styles.hourLabelPlaceholder, isDark && styles.hourLabelPlaceholderDark]}
              onPress={() => setIsSelectionModalVisible(true)}
            >
              <Pencil size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
            {days.map((day, index) => (
              <View key={index} style={[styles.dayColumn, isDark && styles.dayColumnDark]}>
                <Text style={[styles.dayName, isDark && styles.dayNameDark, themeStyles.textMedium]}>
                  {format(day, 'EEE', { locale: fr })}
                </Text>
                <Text style={[styles.dayNumber, isDark && styles.dayNumberDark, themeStyles.textBold]}>
                  {format(day, 'd')}
                </Text>
              </View>
            ))}
          </View>
<PullToRefresh refreshing={isLoading} onRefresh={onRefresh}>
            {hours.map(hour => (
              <View key={hour} style={[styles.timeRow, isDark && styles.timeRowDark]}>
                <View style={[styles.hourLabel, isDark && styles.hourLabelDark]}>
                  <Text style={[styles.hourText, isDark && styles.hourTextDark, themeStyles.text]}>
                    {`${hour}:00`}
                  </Text>
                </View>
                <View style={[styles.slots, isDark && styles.slotsDark]}>
{days.map((_, dayIndex) => {
  const slot = filteredTimeSlots.find(
    s => s.day === dayIndex && s.startHour === hour
  );

  const slotDate = new Date(currentWeek);
  slotDate.setDate(slotDate.getDate() + dayIndex);
  slotDate.setHours(hour, 0, 0, 0);
  const isPast = slotDate < new Date(new Date().getTime() + 60 * 60 * 1000);


  const modeColor =
    slot?.mode === 'comfort' ? '#FF9800' :
    slot?.mode === 'eco' ? '#4CAF50' :
    slot?.mode === 'frost' ? '#00A8E8' :
    slot?.mode === 'off' ? '#D32F2F' :
    undefined;
  return (
<Pressable
  key={dayIndex}
  style={[
    styles.slot,
    isDark && styles.slotDark,
    slot && slot.mode && { backgroundColor: modeColor + 'ff' }, // Mode avec opacité maximale (ff -> 255 en hex)
    isPast && { backgroundColor: isDark ? '#ffffff' : '#03082F' },  // Pour les jours passés
    isPast && { opacity: 1 }, // Réduction de l'opacité pour les jours passés
  ]}
  onPress={isPast ? undefined : () => handleGridPress(dayIndex, hour)}
/>

  );
})}
                </View>
              </View>
            ))}
          </PullToRefresh>
        </View>
      </View>

<ScheduleSelectionModal
  isVisible={isSelectionModalVisible}
  onClose={() => setIsSelectionModalVisible(false)}
  onConfirm={handleSelectionConfirm}
  onDelete={handleSelectionDelete} // ✅ AJOUT OBLIGATOIRE
  rooms={rooms}
  days={days}
/>


      <Modal
        isVisible={isWeekSelectorVisible}
        onBackdropPress={() => setIsWeekSelectorVisible(false)}
        onBackButtonPress={() => setIsWeekSelectorVisible(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[styles.weekSelectorModal, isDark && styles.weekSelectorModalDark]}>
          <View style={styles.weekSelectorModalHeader}>
            <Text style={[styles.weekSelectorModalTitle, isDark && styles.weekSelectorModalTitleDark, themeStyles.textSemiBold]}>
              Sélectionner une semaine
            </Text>
            <Pressable onPress={() => setIsWeekSelectorVisible(false)} style={styles.closeButton}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>
          <WeekCalendar
            selectedWeeks={[currentWeek]}
            onWeekSelect={handleWeekSelect}
          />
        </View>
      </Modal>

      <Modal
        isVisible={isModeModalVisible}
        onBackdropPress={() => {
          setIsModeModalVisible(false);
          setSelectedSlot(null);
        }}
        onBackButtonPress={() => {
          setIsModeModalVisible(false);
          setSelectedSlot(null);
        }}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[styles.modeModal, isDark && styles.modeModalDark]}>
          <View style={styles.modeModalHeader}>
            <Text style={[styles.modeModalTitle, isDark && styles.modeModalTitleDark, themeStyles.textSemiBold]}>
              Choisir le mode
            </Text>
            <Pressable
              onPress={() => {
                setIsModeModalVisible(false);
                setSelectedSlot(null);
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
                  { backgroundColor: mode.color + '20' },
                  selectedMode === mode.id && { backgroundColor: mode.color }
                ]}
                onPress={() => handleModeSelect(mode.id)}
              >
                <Text
                  style={[
                    styles.modeOptionText,
                    { color: mode.color },
                    selectedMode === mode.id && { color: '#ffffff' },
                    themeStyles.textMedium
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.deleteOption,
                {
                  backgroundColor: isDark
                    ? selectedMode === 'delete'
                      ? '#ffffff'
                      : 'transparent'
                    : selectedMode === 'delete'
                      ? '#03082F'
                      : 'transparent',
                  borderWidth: 1,
                  borderColor: isDark ? '#ffffff' : '#03082F',
                }
              ]}
              onPress={() => handleModeSelect('delete')}
            >
              <Text
                style={[
                  styles.deleteOptionText,
                  {
                    color: isDark
                      ? selectedMode === 'delete'
                        ? '#03082F'
                        : '#ffffff'
                      : selectedMode === 'delete'
                        ? '#ffffff'
                        : '#03082F',
                  },
                  themeStyles.textMedium
                ]}
              >
                Supprimer
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 40,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weekNavigationButton: {
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
  weekNavigationButtonDark: {
    backgroundColor: '#03082F',
  },
  weekSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  weekSelectorDark: {
    backgroundColor: '#03082F',
  },
  weekText: {
    fontSize: 16,
    color: '#03082F',
  },
  weekTextDark: {
    color: '#ffffff',
  },
  roomNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  roomNavigationButton: {
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
  roomNavigationButtonDark: {
    backgroundColor: '#03082F',
  },
  roomSelector: {
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
  roomSelectorDark: {
    backgroundColor: '#03082F',
  },
  roomText: {
    fontSize: 16,
    color: '#03082F',
  },
  roomTextDark: {
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
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
  legendDark: {
    backgroundColor: '#03082F',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#03082F',
  },
  legendTextDark: {
    color: '#ffffff',
  },
  schedule: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
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
  scheduleDark: {
    backgroundColor: '#03082F',
  },
  daysHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  daysHeaderDark: {
    backgroundColor: '#03082F',
    borderBottomColor: '#ffffff20',
  },
  hourLabelPlaceholder: {
    width: HOUR_LABEL_WIDTH,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourLabelPlaceholderDark: {
    backgroundColor: '#03082F',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  dayColumnDark: {
    backgroundColor: '#03082F',
  },
  dayName: {
    fontSize: 12,
    color: '#03082F',
    textTransform: 'capitalize',
  },
  dayNameDark: {
    color: '#ffffff',
  },
  dayNumber: {
    fontSize: 16,
    color: '#03082F',
    marginTop: 4,
  },
  dayNumberDark: {
    color: '#ffffff',
  },
  timeGrid: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    height: TIME_SLOT_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timeRowDark: {
    borderBottomColor: '#ffffff20',
  },
  hourLabel: {
    width: HOUR_LABEL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  hourLabelDark: {
    backgroundColor: '#03082F',
    borderRightColor: '#ffffff20',
  },
  hourText: {
    fontSize: 12,
    color: '#03082F',
  },
  hourTextDark: {
    color: '#ffffff',
  },
  slots: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  slotsDark: {
    backgroundColor: '#03082F',
  },
  slot: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  slotDark: {
    borderRightColor: '#ffffff20',
  },
  modal: {
    margin: 20,
  },
  weekSelectorModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: 'center',
      },
    }),
  },
  weekSelectorModalDark: {
    backgroundColor: '#03082F',

  },
  weekSelectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  weekSelectorModalTitle: {
    fontSize: 18,
    color: '#03082F',
  },
  weekSelectorModalTitleDark: {
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
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
  deleteOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  deleteOptionText: {
    fontSize: 14,
  },

});
