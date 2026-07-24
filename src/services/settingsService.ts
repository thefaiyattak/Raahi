import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@app_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  pushNotifications: true,
  rideAlerts: true,
  smsAlerts: true,
  soundEnabled: true,
  language: 'English',
  defaultCity: 'Islamabad',
};

export const getAppSettingsLocal = async (): Promise<AppSettings> => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[SettingsService] Error reading settings', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveAppSettingsLocal = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    const current = await getAppSettingsLocal();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('[SettingsService] Error saving settings', e);
    throw new Error('Failed to save settings.');
  }
};
