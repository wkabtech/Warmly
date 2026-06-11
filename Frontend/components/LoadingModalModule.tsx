import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { Check } from 'lucide-react-native';

export default function LoadingModalModule({
  title = "Connexion au module...",
  subtitle = "",
  isSuccess = false
}) {
  const { isDark, styles: themeStyles } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      // Affiche l’animation après un petit délai
      setTimeout(() => setShowSuccess(true), 400);

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isSuccess]);

  return (
    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
      <View style={styles.logoContainer}>
        <Logo size={48} />
      </View>

      <Text style={[
        styles.primaryText,
        isDark && styles.primaryTextDark,
        themeStyles.textMedium
      ]}>
        {showSuccess ? title : title}
      </Text>

      {!!subtitle && (
        <Text style={[
          styles.secondaryText,
          isDark && styles.secondaryTextDark,
          themeStyles.text
        ]}>
          {subtitle}
        </Text>
      )}

      {showSuccess ? (
        <Animated.View style={{ marginTop: 20, transform: [{ scale: scaleAnim }] }}>
          <Check size={48} color="#4CAF50" />
        </Animated.View>
      ) : (
        <ActivityIndicator
          style={{ marginTop: 20 }}
          size="large"
          color={isDark ? '#ffffff' : '#03082F'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
  },
  modalContentDark: {
    backgroundColor: '#03082F',
  },
  logoContainer: {
    marginBottom: 16,
  },
  primaryText: {
    fontSize: 16,
    color: '#03082F',
    textAlign: 'center',
  },
  primaryTextDark: {
    color: '#ffffff',
  },
  secondaryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#03082F80',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  secondaryTextDark: {
    color: '#ffffff80',
  },
});
