/**
 * Theme context for managing light/dark mode preference.
 * Persists user choice in AsyncStorage. Uses NativeWind's colorScheme API.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  cardBg: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarInactive: string;
}

const LIGHT_COLORS: ThemeColors = {
  bg: '#F2F4F7',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0B1D3A',
  textSecondary: 'rgba(11,29,58,0.7)',
  textMuted: 'rgba(11,29,58,0.5)',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarInactive: '#9CA3AF',
};

const DARK_COLORS: ThemeColors = {
  bg: '#0F1419',
  cardBg: '#1A2332',
  border: '#2A3A4E',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  tabBarBg: '#1A2332',
  tabBarBorder: '#2A3A4E',
  tabBarInactive: '#6B7280',
};

interface ThemeContextValue {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (pref: ThemePreference) => void;
}

const THEME_STORAGE_KEY = '@nudgli/theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  colorScheme: 'light',
  colors: LIGHT_COLORS,
  isDark: false,
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme: 'light' | 'dark' = (useSystemColorScheme() as 'light' | 'dark') ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
      setLoaded(true);
    })();
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  }, []);

  const colorScheme: 'light' | 'dark' =
    preference === 'system' ? systemScheme : preference;

  const isDark = colorScheme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ preference, colorScheme, colors, isDark, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
