import { Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function DashboardIcon({ size }: { size: number }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={{ uri: isDark ? 'https://imgur.com/cXfBOnT.png' : 'https://imgur.com/QV0aL2g.png' }}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

export function RoomsIcon({ size }: { size: number }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={{ uri: isDark ? 'https://imgur.com/feJf2wn.png' : 'https://imgur.com/6VPNq10.png' }}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

export function ScheduleIcon({ size }: { size: number }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={{ uri: isDark ? 'https://imgur.com/2K4cUfb.png' : 'https://imgur.com/zF0TwHA.png' }}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

export function ConsumptionIcon({ size }: { size: number }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={{ uri: isDark ? 'https://imgur.com/0kmzM1u.png' : 'https://imgur.com/rreqEsh.png' }}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    opacity: 0.8,
  },
});