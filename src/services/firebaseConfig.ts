import { AdminFareConfig } from '../types';

const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  databaseURL: 'https://your-project-id-default-rtdb.firebaseio.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

let firebaseAppInstance: any = null;
let isFirebaseAvailable: boolean | null = null;

export const initialize = async (): Promise<boolean> => {
  if (isFirebaseAvailable !== null) return isFirebaseAvailable;

  try {
    // @ts-ignore
    const { default: firebase } = await import('@react-native-firebase/app');
    
    // Check if app is already initialized
    if (firebase.apps.length > 0) {
      firebaseAppInstance = firebase.app();
    } else {
      firebaseAppInstance = await firebase.initializeApp(firebaseConfig);
    }
    
    // Lazy-load database to ensure it's registered
    // @ts-ignore
    await import('@react-native-firebase/database');
    
    isFirebaseAvailable = true;
    console.log('[FirebaseConfigService] Firebase initialized successfully.');
    return true;
  } catch (error) {
    console.warn('[FirebaseConfigService] Firebase native SDKs not installed or could not be loaded. Operating in offline/local-fallback mode.');
    isFirebaseAvailable = false;
    return false;
  }
};

export const fetchFareRates = async (): Promise<AdminFareConfig | null> => {
  try {
    const available = await initialize();
    if (!available) return null;

    // @ts-ignore
    const { default: firebase } = await import('@react-native-firebase/app');
    const database = firebase.app().database();
    
    const snapshot = await database.ref('/admin/rates').once('value');
    if (snapshot.exists()) {
      return snapshot.val() as AdminFareConfig;
    }
    return null;
  } catch (error) {
    console.warn('[FirebaseConfigService] Failed to fetch fare rates from RTDB:', error);
    return null;
  }
};

export const listenFareRates = (onUpdate: (config: AdminFareConfig | null) => void): (() => void) => {
  let ref: any = null;
  let callback: any = null;

  const setupListener = async () => {
    try {
      const available = await initialize();
      if (!available) {
        onUpdate(null);
        return;
      }

      // @ts-ignore
      const { default: firebase } = await import('@react-native-firebase/app');
      const database = firebase.app().database();
      ref = database.ref('/admin/rates');
      callback = ref.on('value', (snapshot: any) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.val() as AdminFareConfig);
        } else {
          onUpdate(null);
        }
      });
    } catch (error) {
      console.warn('[FirebaseConfigService] Failed to setup RTDB rates listener:', error);
      onUpdate(null);
    }
  };

  setupListener();

  return () => {
    if (ref && callback) {
      try {
        ref.off('value', callback);
      } catch (e) {
        console.warn('[FirebaseConfigService] Error unsubscribing from rates listener:', e);
      }
    }
  };
};

export const postActiveRide = async (tripId: string, tripSummary: any): Promise<boolean> => {
  try {
    const available = await initialize();
    if (!available) return false;

    // @ts-ignore
    const { default: firebase } = await import('@react-native-firebase/app');
    const database = firebase.app().database();
    await database.ref(`/active_rides/${tripId}`).set({
      ...tripSummary,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('[FirebaseConfigService] Failed to post active ride:', error);
    return false;
  }
};

export const removeActiveRide = async (tripId: string): Promise<boolean> => {
  try {
    const available = await initialize();
    if (!available) return false;

    // @ts-ignore
    const { default: firebase } = await import('@react-native-firebase/app');
    const database = firebase.app().database();
    await database.ref(`/active_rides/${tripId}`).remove();
    return true;
  } catch (error) {
    console.warn('[FirebaseConfigService] Failed to remove active ride:', error);
    return false;
  }
};
