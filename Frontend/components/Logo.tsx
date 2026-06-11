import { Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function Logo() {
  const { isDark } = useTheme();

  return (
    <Image
      source={{ uri: isDark ? 'https://imgur.com/8oD4t4b.png' : 'https://imgur.com/dJov4EI.png' }}
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 180,
    height: 60,
  },
});