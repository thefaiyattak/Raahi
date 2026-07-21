import AsyncStorage from '@react-native-async-storage/async-storage';
import { DriverProfile, UserProfile } from '../types';

const STORAGE_KEY = '@driver_profile';
const STORAGE_KEY_USER = '@user_profile';
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export interface ValidationResult {
  isValid: boolean;
  fieldErrors: {
    vehicleName?: string;
    vehicleModel?: string;
    phoneNumber?: string;
  };
}

export const validateProfile = (profile: Partial<DriverProfile>): ValidationResult => {
  const fieldErrors: ValidationResult['fieldErrors'] = {};

  if (!profile.vehicleName || profile.vehicleName.trim().length < 2) {
    fieldErrors.vehicleName = 'Vehicle name must be at least 2 characters.';
  }

  if (!profile.vehicleModel || profile.vehicleModel.trim().length < 1) {
    fieldErrors.vehicleModel = 'Vehicle model/year is required.';
  }

  if (!profile.phoneNumber || !PHONE_REGEX.test(profile.phoneNumber)) {
    fieldErrors.phoneNumber = 'Phone number must be in E.164 format (e.g. +1234567890).';
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
};

export const isValidDriverProfile = (profile: any): profile is DriverProfile => {
  if (!profile || typeof profile !== 'object') return false;
  const { vehicleName, vehicleModel, phoneNumber, defaultACStatus } = profile;
  
  return (
    typeof vehicleName === 'string' &&
    vehicleName.trim().length >= 2 &&
    typeof vehicleModel === 'string' &&
    vehicleModel.trim().length >= 1 &&
    typeof phoneNumber === 'string' &&
    PHONE_REGEX.test(phoneNumber) &&
    typeof defaultACStatus === 'boolean'
  );
};

export const saveDriverProfile = async (profile: DriverProfile): Promise<void> => {
  try {
    const validation = validateProfile(profile);
    if (!validation.isValid) {
      const firstError = Object.values(validation.fieldErrors)[0];
      throw new Error(firstError || 'Invalid profile data.');
    }

    const serialized = JSON.stringify(profile);
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (error: any) {
    console.error(`[StorageService] Error saving profile:`, error);
    throw new Error(error.message || 'Failed to save vehicle profile.');
  }
};

export const getDriverProfile = async (): Promise<DriverProfile | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (isValidDriverProfile(parsed)) {
        return parsed;
      } else {
        console.warn('[StorageService] Stored profile has invalid structure. Auto-clearing...');
        await clearDriverProfile();
        return null;
      }
    } catch (parseError) {
      console.warn('[StorageService] Failed to parse stored profile. Auto-clearing...');
      await clearDriverProfile();
      return null;
    }
  } catch (error: any) {
    console.error(`[StorageService] Error getting profile:`, error);
    throw new Error('Failed to retrieve vehicle profile.');
  }
};

export const clearDriverProfile = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error(`[StorageService] Error clearing profile:`, error);
    throw new Error('Failed to clear vehicle profile.');
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    if (!profile.fullName || profile.fullName.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }
    if (!profile.phoneNumber || !PHONE_REGEX.test(profile.phoneNumber)) {
      throw new Error('Phone number must be in E.164 format (e.g. +1234567890).');
    }
    const serialized = JSON.stringify(profile);
    await AsyncStorage.setItem(STORAGE_KEY_USER, serialized);
  } catch (error: any) {
    console.error(`[StorageService] Error saving user profile:`, error);
    throw new Error(error.message || 'Failed to save user profile.');
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (error: any) {
    console.error(`[StorageService] Error getting user profile:`, error);
    throw new Error('Failed to retrieve user profile.');
  }
};

export const clearUserProfile = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
  } catch (error) {
    console.error(`[StorageService] Error clearing user profile:`, error);
    throw new Error('Failed to clear user profile.');
  }
};
