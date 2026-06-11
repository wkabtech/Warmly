import { ReactNode } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PullToRefreshProps {
  onRefresh: () => void;
  refreshing: boolean;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, refreshing, children }: PullToRefreshProps) {
  const { isDark } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#03082F' : '#ffffff' }} // fond selon thème
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? '#ffffff' : '#03082F'} // couleur de la flèche au début
          colors={[isDark ? '#ffffff' : '#03082F']}  // couleur de l'animation de refresh (Android)
          progressBackgroundColor={isDark ? '#03082F' : '#ffffff'} // 👈 pour Android: couleur du cercle autour
        />
      }
    >
      {children}
    </ScrollView>
  );
}
