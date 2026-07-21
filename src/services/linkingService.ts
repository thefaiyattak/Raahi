import { Linking } from 'react-native';
import { decodeDeepLink } from './deepLinkService';
import { TripData } from '../types';

export const canOpenURL = async (url: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(url);
  } catch (error) {
    console.error('[LinkingService] error checking URL capability:', error);
    return false;
  }
};

export const openURL = async (url: string): Promise<void> => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('[LinkingService] error opening URL:', error);
    throw new Error('Failed to open link.');
  }
};

export const processURL = (url: string | null, onTripReceived: (trip: TripData) => void): void => {
  if (!url) return;
  console.log('[LinkingService] Processing incoming URL:', url);
  const trip = decodeDeepLink(url);
  if (trip) {
    onTripReceived(trip);
  } else {
    console.warn('[LinkingService] URL is not a valid Raahi deep link.');
  }
};

export const handleInitialURL = async (onTripReceived: (trip: TripData) => void): Promise<void> => {
  try {
    const url = await Linking.getInitialURL();
    if (url) {
      processURL(url, onTripReceived);
    }
  } catch (error) {
    console.error('[LinkingService] Failed to read initial URL:', error);
  }
};

export const initialize = (onTripReceived: (trip: TripData) => void): (() => void) => {
  // Listen for warm starts
  const subscription = Linking.addEventListener('url', (event) => {
    processURL(event.url, onTripReceived);
  });

  // Check for cold start URL
  handleInitialURL(onTripReceived);

  // Return clean up function
  return () => {
    subscription.remove();
  };
};
