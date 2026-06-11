import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { X, Trash } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export type Mode = 'off' | 'comfort' | 'eco' | 'frost';

interface TimeSlotModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => void;
  time: string;
  day: string;
}

export function TimeSlotModal({
  isVisible,
  onClose,
  onDelete,
  time,
  day,
}: TimeSlotModalProps) {
  const { isDark, styles: themeStyles } = useTheme();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      hideModalContentWhileAnimating
      style={styles.modal}
      animationIn="fadeIn"
      animationOut="fadeOut"
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.titleDark, themeStyles.textSemiBold]}>
            {time} - {day}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.deleteButton, isDark && styles.actionButtonDark]}
            onPress={onDelete}
          >
            <Trash size={16} color={isDark ? '#ffffff' : '#03082F'} />
            <Text style={[styles.actionText, isDark && styles.actionTextDark, themeStyles.textMedium]}>
              Supprimer
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
  },
  container: {
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
  containerDark: {
    backgroundColor: '#03082F',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#f5f5f5',
  },
  actionButtonDark: {
    backgroundColor: '#ffffff10',
  },
  deleteButton: {
    backgroundColor: '#ff000010',
  },
  actionText: {
    fontSize: 14,
    color: '#03082F',
  },
  actionTextDark: {
    color: '#ffffff',
  },
});