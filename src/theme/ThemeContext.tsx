import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAppSettingsLocal, saveAppSettingsLocal } from '../services/settingsService';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBackground: string;
  primaryBorder: string;
  accent: string;
  accentLight: string;
  accentBackground: string;
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
  mutedSurface: string;
  lightBorder: string;
  softShadow: string;
  deepSoftShadow: string;
  greenShadow: string;
  greenTint: string;
  disabledOverlay: string;
  statusBar: 'light-content' | 'dark-content';
}

export const lightColors: ThemeColors = {
  primary: '#2F9A3C',
  primaryDark: '#247D30',
  primaryLight: '#38AF46',
  primaryBackground: 'rgba(47, 154, 60, 0.10)',
  primaryBorder: '#2F9A3C',
  accent: '#2F9A3C',
  accentLight: 'rgba(47, 154, 60, 0.10)',
  accentBackground: 'rgba(47, 154, 60, 0.10)',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F2F3F2',
  cardBackground: '#FFFFFF',
  textPrimary: '#262A27',
  textSecondary: '#8A908B',
  textMuted: '#8A908B',
  textLight: '#FFFFFF',
  border: '#E3E7E3',
  inputBackground: '#FFFFFF',
  divider: '#E3E7E3',
  icon: '#262A27',
  mutedSurface: '#E9ECE9',
  lightBorder: '#E3E7E3',
  softShadow: 'rgba(38, 42, 39, 0.12)',
  deepSoftShadow: 'rgba(38, 42, 39, 0.18)',
  greenShadow: 'rgba(47, 154, 60, 0.25)',
  greenTint: 'rgba(47, 154, 60, 0.10)',
  disabledOverlay: 'rgba(138, 144, 139, 0.20)',
  statusBar: 'dark-content',
};

export const darkColors: ThemeColors = {
  ...lightColors, // Consistent neumorphic appearance on light theme baseline
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
