import React, { useState, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import VehicleConfigScreen from './src/screens/VehicleConfigScreen';
import CreateRideScreen from './src/screens/CreateRideScreen';
import TripViewerScreen from './src/screens/TripViewerScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initialize as initLinking } from './src/services/linkingService';
import { initializeFareRates, subscribeToFareUpdates } from './src/services/fareEngine';
import { syncFareFormulaFromGoogleSheets } from './src/services/fareCalculationService';
import { getAuthSession, AuthSession } from './src/services/authService';
import { getUserProfile } from './src/services/storage';
import { TripData, UserProfile } from './src/types';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

import RoleSelectModal from './src/components/RoleSelectModal';
import { saveUserProfile } from './src/services/storage';

type ScreenType = 'home' | 'vehicle_config' | 'create_ride' | 'trip_viewer' | 'profile' | 'settings' | 'notifications';

function AppContent() {
  const { theme } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);

  // Selected filter cities to pass between screens
  const [selectedFromCity, setSelectedFromCity] = useState<string>('');
  const [selectedToCity, setSelectedToCity] = useState<string>('');

  // Auth & Profile states
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Role Selection at App Opening Modal state
  const [showRoleSelectModal, setShowRoleSelectModal] = useState(false);

  useEffect(() => {
    // 1. Initialize fare rates and sync latest Fuel & Toll formula from Google Sheets
    initializeFareRates();
    syncFareFormulaFromGoogleSheets();

    // 2. Subscribe to Firebase real-time overrides
    const unsubscribeRates = subscribeToFareUpdates(() => {
      // Re-trigger render or state if rates update
    });

    // 3. Listen for incoming deep links
    const unsubscribeLinking = initLinking((trip: TripData) => {
      setActiveTrip(trip);
      setCurrentScreen('trip_viewer');
    });

    // 4. Check active login session
    checkSession();

    return () => {
      unsubscribeRates();
      unsubscribeLinking();
    };
  }, []);

  const checkSession = async () => {
    try {
      const session = await getAuthSession();
      if (session) {
        setAuthSession(session);
        const profile = await getUserProfile();
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (e) {
      console.warn('Failed to load session details', e);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleLoginSuccess = async (session: AuthSession, initialMode?: 'passenger' | 'driver') => {
    setAuthSession(session);
    const profile = await getUserProfile();
    if (profile) {
      const updated = { ...profile, activeProfile: initialMode || profile.activeProfile || 'passenger' };
      setUserProfile(updated);
      await saveUserProfile(updated);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleRoleSelected = async (role: 'passenger' | 'driver') => {
    if (userProfile) {
      const updated = { ...userProfile, activeProfile: role };
      setUserProfile(updated);
      await saveUserProfile(updated);
    }
  };

  const navigateTo = (screen: ScreenType) => {
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('home');
    if (currentScreen === 'trip_viewer') {
      setActiveTrip(null);
    }
  };

  const handleSignOut = () => {
    setAuthSession(null);
    setUserProfile(null);
    setCurrentScreen('home');
  };

  const renderScreen = () => {
    // 1. If session still loading, display progress loader
    if (isLoadingSession) {
      return (
        <View style={[styles.center, { backgroundColor: theme?.background || '#F2F3F2' }]}>
          <ActivityIndicator size="large" color={theme?.primary || '#2F9A3C'} />
        </View>
      );
    }

    // 2. If user not logged in, display Login screen
    if (!authSession) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    // 3. If user logged in but has not set up profile, display Profile Setup screen
    if (!userProfile) {
      return (
        <ProfileSetupScreen
          uid={authSession.uid}
          email={authSession.email}
          photoUrl={authSession.photoUrl}
          onProfileComplete={handleProfileComplete}
        />
      );
    }

    // 4. Otherwise, display the application dashboard
    switch (currentScreen) {
      case 'profile':
        return (
          <ProfileScreen
            userProfile={userProfile}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onNavigateToVehicleConfig={() => navigateTo('vehicle_config')}
            onNavigateToSettings={() => navigateTo('settings')}
            onBack={handleBack}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={handleBack}
            onSignOut={handleSignOut}
            onNavigateToProfile={() => navigateTo('profile')}
            onSwitchRole={handleRoleSelected}
            userProfile={userProfile}
          />
        );
      case 'notifications':
        return <NotificationScreen onBack={handleBack} />;
      case 'vehicle_config':
        return <VehicleConfigScreen onBack={handleBack} />;
      case 'create_ride':
        return (
          <CreateRideScreen
            initialFrom={selectedFromCity}
            initialTo={selectedToCity}
            onBack={handleBack}
            onNavigateToProfile={() => navigateTo('vehicle_config')}
          />
        );
      case 'trip_viewer':
        if (activeTrip) {
          return <TripViewerScreen trip={activeTrip} onBack={handleBack} />;
        }
        return (
          <HomeScreen
            userProfile={userProfile}
            onNavigateToCreateRide={(from, to) => {
              setSelectedFromCity(from || '');
              setSelectedToCity(to || '');
              navigateTo('create_ride');
            }}
            onNavigateToVehicleConfig={() => navigateTo('vehicle_config')}
            onNavigateToProfile={() => navigateTo('profile')}
            onNavigateToSettings={() => navigateTo('settings')}
            onNavigateToNotifications={() => navigateTo('notifications')}
            onNavigateToTripViewer={(trip) => {
              setActiveTrip(trip);
              navigateTo('trip_viewer');
            }}
            onSignOut={handleSignOut}
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            userProfile={userProfile}
            onNavigateToCreateRide={(from, to) => {
              setSelectedFromCity(from || '');
              setSelectedToCity(to || '');
              navigateTo('create_ride');
            }}
            onNavigateToVehicleConfig={() => navigateTo('vehicle_config')}
            onNavigateToProfile={() => navigateTo('profile')}
            onNavigateToSettings={() => navigateTo('settings')}
            onNavigateToNotifications={() => navigateTo('notifications')}
            onNavigateToTripViewer={(trip) => {
              setActiveTrip(trip);
              navigateTo('trip_viewer');
            }}
            onSignOut={handleSignOut}
            onToggleProfileMode={async (newMode) => {
              const updated = { ...userProfile, activeProfile: newMode };
              setUserProfile(updated);
              await saveUserProfile(updated);
            }}
          />
        );
    }
  };

  return (
    <ErrorBoundary onReset={() => setCurrentScreen('home')}>
      <StatusBar barStyle={theme?.statusBar || 'dark-content'} backgroundColor={theme?.cardBackground || '#FFFFFF'} translucent={false} />
      <View style={{ flex: 1, backgroundColor: theme?.background || '#F2F3F2' }}>
        {renderScreen()}
      </View>
    </ErrorBoundary>
  );
}

import { LanguageProvider } from './src/i18n/LanguageContext';
import { AlertProvider, useAlert, setGlobalAlertHandler } from './src/context/AlertContext';

function AppWithAlert() {
  const { showAlert } = useAlert();
  useEffect(() => {
    setGlobalAlertHandler(showAlert);
  }, [showAlert]);

  return <AppContent />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AlertProvider>
          <AppWithAlert />
        </AlertProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
