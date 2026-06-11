import React, { createContext, useContext, useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { storage } from '../utils/storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  styles: typeof baseStyles;
  getMessageStyle: (type: 'success' | 'error') => object;
}

const THEME_STORAGE_KEY = '@app_theme';

const baseStyles = StyleSheet.create({
  text: {
    fontFamily: 'PlusJakartaSans-Regular',
  },
  textMedium: {
    fontFamily: 'PlusJakartaSans-Medium',
  },
  textSemiBold: {
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  textBold: {
    fontFamily: 'PlusJakartaSans-Bold',
  },
});

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await storage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Erreur lors du chargement du thème:', error);
      setIsLoaded(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await storage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  const getMessageStyle = (type: 'success' | 'error') => ({
    textAlign: 'center',
    color: type === 'success' ? '#4CAF50' : '#D32F2F',
    fontFamily: 'PlusJakartaSans-Medium',
    marginBottom: 12
  });

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        styles: baseStyles,
        getMessageStyle
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
