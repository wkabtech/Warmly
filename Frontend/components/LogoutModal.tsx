import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface LogoutModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({
  isVisible,
  onClose,
  onConfirm,
}: LogoutModalProps) {
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
            Déconnexion
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={isDark ? '#ffffff' : '#03082F'} />
          </Pressable>
        </View>

        <Text style={[styles.message, isDark && styles.messageDark, themeStyles.text]}>
          Êtes-vous sûr de vouloir vous déconnecter ?
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.cancelButton, isDark && styles.cancelButtonDark]}
            onPress={onClose}
          >
            <Text style={[
              styles.buttonText,
              styles.cancelButtonText,
              isDark && styles.cancelButtonTextDark,
              themeStyles.textMedium
            ]}>
              Annuler
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.confirmButton, isDark && styles.confirmButtonDark]}
            onPress={onConfirm}
          >
            <Text style={[
              styles.buttonText,
              styles.confirmButtonText,
              isDark && styles.confirmButtonTextDark,
              themeStyles.textMedium
            ]}>
              Se déconnecter
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
    fontSize: 20,
    color: '#03082F',
  },
  titleDark: {
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    color: '#03082F',
    marginBottom: 24,
    textAlign: 'center',
  },
  messageDark: {
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
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
  buttonText: {
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
});