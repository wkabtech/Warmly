import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Logo } from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useEffect } from 'react';

export function LoadingScreen() {
  const { isDark } = useTheme();

  // 🟡 Crée une sharedValue
  const rotation = useSharedValue('0deg');

  // ✅ Démarre l’animation dans useEffect
  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming('0deg', { duration: 0 }),
        withTiming('360deg', {
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      ),
      -1
    );
  }, []);

  // ✅ Utilisation dans useAnimatedStyle sans démarrer l’animation
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rotation.value }]
  }));

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Animated.View style={spinStyle}>
        <Logo />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerDark: {
    backgroundColor: '#03082F',
  },
});
