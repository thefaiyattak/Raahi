import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAppSettingsLocal, saveAppSettingsLocal } from '../services/settingsService';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBackground: string;
  primaryBorder: string;
  white: string;
  surface: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  border: string;
  inputBackground: string;
  divider: string;
  icon: string;
  statusBar: 'light-content' | 'dark-content';
}

export const lightColors: ThemeColors = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#A5D6A7',
  primaryBackground: '#E8F5E9',
  primaryBorder: '#C8E6C9',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F5F7F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textLight: '#FFFFFF',
  border: '#E5E7EB',
  inputBackground: '#F9FAFB',
  divider: '#F3F4F6',
  icon: '#2E7D32',
  statusBar: 'dark-content',
};

export const darkColors: ThemeColors = {
  primary: '#7CB342', // High contrast vibrant sage green
  primaryDark: '#AED581',
  primaryLight: '#C5E1A5',
  primaryBackground: '#1C2C1E',
  primaryBorder: '#2E4730',
  white: '#FFFFFF',
  surface: '#1E2B20',
  background: '#121A13', // Deep dark green-black
  cardBackground: '#1A261C',
  textPrimary: '#F1F8F1', // High contrast bright text
  textSecondary: '#B0CAB2', // Clear readable subtitle text
  textMuted: '#7E9E81',
  textLight: '#FFFFFF',
  border: '#2B3D2D',
  inputBackground: '#1E2D20',
  divider: '#253727',
  icon: '#7CB342', // High contrast icon color
  statusBar: 'light-content',
};

interface ThemeContextType {
  isDarkMode: boolean;
  theme: ThemeColors;
  setDarkMode: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  theme: lightColors,
  setDarkMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getAppSettingsLocal();
        setIsDarkModeState(!!settings.darkMode);
      } catch (e) {
        console.warn('Failed to load dark mode setting', e);
      }
    })();
  }, []);

  const setDarkMode = async (enabled: boolean) => {
    setIsDarkModeState(enabled);
    try {
      await saveAppSettingsLocal({ darkMode: enabled });
    } catch (e) {
      console.warn('Failed to save dark mode setting', e);
    }
  };

  const theme = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
