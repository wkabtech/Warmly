import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WeekCalendar } from './WeekCalendar';

type Mode = 'comfort' | 'eco' | 'frost' | 'off';
type Step = 'weeks' | 'days' | 'rooms' | 'hours' | 'mode';


interface Room {
  id: number;
  name: string;
}

interface ScheduleSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (selection: {
    rooms: string[];
    days: number[];
    startHour: number;
    endHour: number;
    weeks: Date[];
    mode: Mode;
  }) => void;
  onDelete: (selection: {
    rooms: string[];
    days: number[];
    startHour: number;
    endHour: number;
    weeks: Date[];
  }) => void; // ✅ AJOUTE BIEN CECI
  rooms: Room[]; // ✅ et ici corrige en Room[] (au lieu de string[])
  days: Date[];
}


const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

export function ScheduleSelectionModal({
  isVisible,
  onClose,
  onConfirm,
  onDelete,
  rooms,
  days,
}: ScheduleSelectionModalProps) {
  const { isDark, styles: themeStyles } = useTheme();
  const [step, setStep] = useState<Step>('weeks');
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(18);
  const [selectedMode, setSelectedMode] = useState<Mode | 'delete' | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const modes = [
    { id: 'comfort' as Mode, label: 'Confort', color: '#FF9800' },
    { id: 'eco' as Mode, label: 'Éco', color: '#4CAF50' },
    { id: 'frost' as Mode, label: 'Hors-Gel', color: '#00A8E8' },
    { id: 'off' as Mode, label: 'Arrêt', color: '#D32F2F' },
  ];

  const hasUnsavedChanges = () => {
    return selectedWeeks.length > 0 || selectedDays.length > 0 || selectedRooms.length > 0;
  };

  const resetSelections = () => {
    setStep('weeks');
    setSelectedWeeks([]);
    setSelectedDays([]);
    setSelectedRooms([]);
    setStartHour(8);
    setEndHour(18);
    setSelectedMode(null);
    setShowCancelConfirmation(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCancelConfirmation(true);
    } else {
      resetSelections();
      onClose();
    }
  };

  const handleConfirmClose = () => {
    resetSelections();
    onClose();
  };

  const toggleWeek = (weekStart: Date) => {
    setSelectedWeeks(prev =>
      prev.find(w => format(w, 'yyyy-ww') === format(weekStart, 'yyyy-ww'))
        ? prev.filter(w => format(w, 'yyyy-ww') !== format(weekStart, 'yyyy-ww'))
        : [...prev, weekStart]
    );
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const toggleRoom = (room: string) => {
    setSelectedRooms(prev =>
      prev.includes(room)
        ? prev.filter(r => r !== room)
        : [...prev, room]
    );
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const handleSelectAllRooms = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms([...rooms]);
    }
  };

  const handlePreviousStep = () => {
    switch (step) {
      case 'days':
        setStep('weeks');
        break;
      case 'rooms':
        setStep('days');
        break;
      case 'hours':
        setStep('rooms');
        break;
      case 'mode':
        setStep('hours');
        break;
    }
  };

const handleNextStep = () => {
  switch (step) {
    case 'weeks':
      if (selectedWeeks.length > 0) setStep('days');
      break;
    case 'days':
      if (selectedDays.length > 0) setStep('rooms');
      break;
    case 'rooms':
      if (selectedRooms.length > 0) setStep('hours');
      break;
    case 'hours':
      if (endHour > startHour) setStep('mode');
      break;
    case 'mode':
      if (selectedMode) {
        if (selectedMode === 'delete') {
          onDelete({
            rooms: selectedRooms,
            days: selectedDays,
            startHour,
            endHour,
            weeks: selectedWeeks,
          });
          resetSelections();
          onClose();
        } else {
          handleConfirm(); // appel normal avec mode autre que delete
        }
      }
      break;
  }
};


  const handleConfirm = () => {
    if (selectedMode) {
      onConfirm({
        rooms: selectedRooms,
        days: selectedDays,
        startHour,
        endHour,
        weeks: selectedWeeks,
        mode: selectedMode,
      });
      resetSelections();
      onClose();
    }
  };

  const renderStepTitle = () => {
    switch (step) {
      case 'weeks':
        return 'Sélectionner les semaines';
      case 'days':
        return 'Sélectionner les jours';
      case 'rooms':
        return 'Sélectionner les pièces';
      case 'hours':
        return 'Définir les heures';
      case 'mode':
        return 'Choisir le mode';
    }
  };

  const isNextEnabled = () => {
    switch (step) {
      case 'weeks':
        return selectedWeeks.length > 0;
      case 'days':
        return selectedDays.length > 0;
      case 'rooms':
        return selectedRooms.length > 0;
      case 'hours':
        return endHour > startHour;
      case 'mode':
        return selectedMode !== null;
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'weeks':
        return (
          <WeekCalendar
            selectedWeeks={selectedWeeks}
            onWeekSelect={toggleWeek}
          />
        );

      case 'days':
        return (
          <View style={styles.optionsGrid}>
            <Pressable
              style={[
                styles.selectAllButton,
                selectedDays.length === 7 && styles.selectedOption,
                isDark && styles.optionDark,
                selectedDays.length === 7 && isDark && styles.selectedOptionDark,
              ]}
              onPress={handleSelectAllDays}
            >
              <Text
                style={[
                  styles.selectAllText,
                  selectedDays.length === 7 && styles.selectedOptionText,
                  isDark && styles.optionTextDark,
                  selectedDays.length === 7 && isDark && styles.selectedOptionTextDark,
                  themeStyles.textMedium,
                ]}
              >
                {selectedDays.length === 7 ? 'Désélectionner tout' : 'Tous les jours'}
              </Text>
            </Pressable>

            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
              <Pressable
                key={index}
                style={[
                  styles.option,
                  selectedDays.includes(index) && styles.selectedOption,
                  isDark && styles.optionDark,
                  selectedDays.includes(index) && isDark && styles.selectedOptionDark,
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedDays.includes(index) && styles.selectedOptionText,
                    isDark && styles.optionTextDark,
                    selectedDays.includes(index) && isDark && styles.selectedOptionTextDark,
                    themeStyles.textMedium,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
        );

      case 'rooms':
        return (
          <View style={styles.optionsGrid}>
            <Pressable
              style={[
                styles.selectAllButton,
                selectedRooms.length === rooms.length && styles.selectedOption,
                isDark && styles.optionDark,
                selectedRooms.length === rooms.length && isDark && styles.selectedOptionDark,
              ]}
              onPress={handleSelectAllRooms}
            >
              <Text
                style={[
                  styles.selectAllText,
                  selectedRooms.length === rooms.length && styles.selectedOptionText,
                  isDark && styles.optionTextDark,
                  selectedRooms.length === rooms.length && isDark && styles.selectedOptionTextDark,
                  themeStyles.textMedium,
                ]}
              >
                {selectedRooms.length === rooms.length ? 'Désélectionner tout' : 'Toutes les pièces'}
              </Text>
            </Pressable>

{rooms.map(room => (
  <Pressable
    key={room.id}
    style={[
      styles.option,
      selectedRooms.includes(room.name) && styles.selectedOption,
      isDark && styles.optionDark,
      selectedRooms.includes(room.name) && isDark && styles.selectedOptionDark,
    ]}
    onPress={() => toggleRoom(room.name)} // toggle avec .name
  >
    <Text
      style={[
        styles.optionText,
        selectedRooms.includes(room.name) && styles.selectedOptionText,
        isDark && styles.optionTextDark,
        selectedRooms.includes(room.name) && isDark && styles.selectedOptionTextDark,
        themeStyles.textMedium,
      ]}
    >
      {room.name} {/* ✅ ici on affiche le nom */}
    </Text>
  </Pressable>
))}

          </View>
        );

      case 'hours':
        return (
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerSection}>
              <Text style={[styles.timePickerLabel, isDark && styles.timePickerLabelDark, themeStyles.textMedium]}>
                Heure de début
              </Text>
              <ScrollView
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
              >
                <View style={styles.timePickerPadding} />
                {hours.map(hour => {
                  const isDisabled = hour >= endHour;
                  const isSelected = hour === startHour;
                  return (
                    <Pressable
                      key={hour}
                      style={[
                        styles.timePickerItem,
                        isSelected && styles.selectedTimeItem,
                        isDark && styles.timePickerItemDark,
                        isSelected && isDark && styles.selectedTimeItemDark,
                      ]}
                      onPress={() => {
                        if (!isDisabled) {
                          setStartHour(hour);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.timePickerText,
                          isSelected && styles.selectedTimeText,
                          isDark && styles.timePickerTextDark,
                          isSelected && isDark && styles.selectedTimeTextDark,
                          isDisabled && styles.disabledTimeText,
                          themeStyles.textMedium,
                        ]}
                      >
                        {`${hour}:00`}
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={styles.timePickerPadding} />
              </ScrollView>
            </View>

            <View style={styles.timePickerSection}>
              <Text style={[styles.timePickerLabel, isDark && styles.timePickerLabelDark, themeStyles.textMedium]}>
                Heure de fin
              </Text>
              <ScrollView
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
              >
                <View style={styles.timePickerPadding} />
                {hours.map(hour => {
                  const isDisabled = hour <= startHour;
                  const isSelected = hour === endHour;
                  return (
                    <Pressable
                      key={hour}
                      style={[
                        styles.timePickerItem,
                        isSelected && styles.selectedTimeItem,
                        isDark && styles.timePickerItemDark,
                        isSelected && isDark && styles.selectedTimeItemDark,
                      ]}
                      onPress={() => {
                        if (!isDisabled) {
                          setEndHour(hour);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.timePickerText,
                          isSelected && styles.selectedTimeText,
                          isDark && styles.timePickerTextDark,
                          isSelected && isDark && styles.selectedTimeTextDark,
                          isDisabled && styles.disabledTimeText,
                          themeStyles.textMedium,
                        ]}
                      >
                        {`${hour}:00`}
                      </Text>
                    </Pressable>
                  );
                })}
                <View style={styles.timePickerPadding} />
              </ScrollView>
            </View>
          </View>
        );

      case 'mode':
        return (
          <View style={styles.optionsGrid}>
            {modes.map(mode => (
              <Pressable
                key={mode.id}
                style={[
                  styles.modeOption,
                  { backgroundColor: mode.color + '20' },
                  selectedMode === mode.id && { backgroundColor: mode.color }
                ]}
                onPress={() => setSelectedMode(mode.id)}
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
              onPress={() => setSelectedMode('delete')}
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
        );
    }
  };

  return (
    <>
      <Modal
        isVisible={isVisible && !showCancelConfirmation}
        onBackdropPress={handleClose}
        onBackButtonPress={handleClose}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDark && styles.titleDark, themeStyles.textSemiBold]}>
              {renderStepTitle()}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {renderContent()}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {step !== 'weeks' && (
                <Pressable
                  style={[
                    styles.navigationButton,
                    isDark && styles.navigationButtonDark,
                  ]}
                  onPress={handlePreviousStep}
                >
                  <ChevronLeft size={20} color={isDark ? '#ffffff' : '#03082F'} />
                  <Text
                    style={[
                      styles.navigationText,
                      isDark && styles.navigationTextDark,
                      themeStyles.textMedium,
                    ]}
                  >
                    Précédent
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.navigationButton,
                  !isNextEnabled() && styles.navigationButtonDisabled,
                  isDark && styles.navigationButtonDark,
                  { marginLeft: step !== 'weeks' ? 8 : 0 },
                ]}
                onPress={isNextEnabled() ? handleNextStep : undefined}
              >
                <Text
                  style={[
                    styles.navigationText,
                    !isNextEnabled() && styles.navigationTextDisabled,
                    isDark && styles.navigationTextDark,
                    themeStyles.textMedium,
                  ]}
                >
                  {step === 'mode' ? 'Confirmer' : 'Suivant'}
                </Text>
                {step === 'mode' ? (
                  <Check size={20} color={isNextEnabled() ? (isDark ? '#ffffff' : '#03082F') : '#999999'} />
                ) : (
                  <ChevronRight size={20} color={isNextEnabled() ? (isDark ? '#ffffff' : '#03082F') : '#999999'} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={showCancelConfirmation}
        onBackdropPress={() => setShowCancelConfirmation(false)}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[styles.confirmationContainer, isDark && styles.confirmationContainerDark]}>
          <Text style={[styles.confirmationTitle, isDark && styles.confirmationTitleDark, themeStyles.textSemiBold]}>
            Annuler la sélection ?
          </Text>
          <Text style={[styles.confirmationText, isDark && styles.confirmationTextDark, themeStyles.text]}>
            Toutes les modifications seront perdues. Êtes-vous sûr de vouloir annuler ?
          </Text>
          <View style={styles.confirmationButtons}>
            <Pressable
              style={[styles.confirmationButton, styles.cancelButton, isDark && styles.cancelButtonDark]}
              onPress={() => setShowCancelConfirmation(false)}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.cancelButtonText,
                isDark && styles.cancelButtonTextDark,
                themeStyles.textMedium
              ]}>
                Continuer
              </Text>
            </Pressable>
            <Pressable
              style={[styles.confirmationButton, styles.confirmButton, isDark && styles.confirmButtonDark]}
              onPress={handleConfirmClose}
            >
              <Text style={[
                styles.confirmationButtonText,
                styles.confirmButtonText,
                isDark && styles.confirmButtonTextDark,
                themeStyles.textMedium
              ]}>
                Annuler
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: 'center',
      },
    }),
  },
  containerDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    color: '#03082F',
  },
  titleDark: {
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  optionsGrid: {
    gap: 12,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  optionDark: {
    backgroundColor: '#ffffff10',
  },
  selectedOption: {
    backgroundColor: '#03082F',
  },
  selectedOptionDark: {
    backgroundColor: '#ffffff',
  },
  optionText: {
    fontSize: 14,
    color: '#03082F',
  },
  optionTextDark: {
    color: '#ffffff',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  selectedOptionTextDark: {
    color: '#03082F',
  },
  timePickerContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  timePickerSection: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    color: '#03082F80',
    marginBottom: 8,
  },
  timePickerLabelDark: {
    color: '#ffffff80',
  },
  timePicker: {
    width: '100%',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  timePickerPadding: {
    height: ITEM_HEIGHT * 2,
  },
  timePickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  timePickerItemDark: {
    backgroundColor: '#ffffff10',
  },
  selectedTimeItem: {
    backgroundColor: '#03082F',
  },
  selectedTimeItemDark: {
    backgroundColor: '#ffffff',
  },
  timePickerText: {
    fontSize: 16,
    color: '#03082F',
  },
  timePickerTextDark: {
    color: '#ffffff',
  },
  selectedTimeText: {
    color: '#ffffff',
  },
  selectedTimeTextDark: {
    color: '#03082F',
  },
  disabledTimeText: {
    color: '#99999950',
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  navigationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF5010',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  navigationButtonDark: {
    backgroundColor: '#ffffff10',
  },
  navigationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  navigationText: {
    fontSize: 16,
    color: '#03082F',
  },
  navigationTextDark: {
    color: '#ffffff',
  },
  navigationTextDisabled: {
    color: '#999999',
  },
  confirmationContainer: {
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
  confirmationContainerDark: {
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
  confirmButton: {
    backgroundColor: '#D32F2F',
  },
  confirmButtonDark: {
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
  confirmButtonText: {
    color: '#ffffff',
  },
  confirmButtonTextDark: {
    color: '#ffffff',
  },
  selectAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#03082F',
  },
});