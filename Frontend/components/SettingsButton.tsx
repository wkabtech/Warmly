import { Pressable, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

export function SettingsButton() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push('/(tabs)/settings')}
    >
      <Settings size={24} color={isDark ? '#ffffff' : '#03082F'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});