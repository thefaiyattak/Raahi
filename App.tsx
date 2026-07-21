import React, { useState, useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import VehicleConfigScreen from './src/screens/VehicleConfigScreen';
import CreateRideScreen from './src/screens/CreateRideScreen';
import TripViewerScreen from './src/screens/TripViewerScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initialize as initLinking } from './src/services/linkingService';
import { initializeFareRates, subscribeToFareUpdates } from './src/services/fareEngine';
import { getAuthSession, AuthSession } from './src/services/authService';
import { getUserProfile } from './src/services/storage';
import { TripData, UserProfile } from './src/types';

type ScreenType = 'home' | 'vehicle_config' | 'create_ride' | 'trip_viewer';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);

  // Auth & Profile states
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    // 1. Initialize fare rates
    initializeFareRates();

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

  const handleLoginSuccess = async (session: AuthSession) => {
    setAuthSession(session);
    const profile = await getUserProfile();
    if (profile) {
      setUserProfile(profile);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
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

  const renderScreen = () => {
    // 1. If session still loading, display progress loader
    if (isLoadingSession) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#43A047" />
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
      case 'vehicle_config':
        return <VehicleConfigScreen onBack={handleBack} />;
      case 'create_ride':
        return (
          <CreateRideScreen
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
            onNavigateToCreateRide={() => navigateTo('create_ride')}
            onNavigateToVehicleConfig={() => navigateTo('vehicle_config')}
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            userProfile={userProfile}
            onNavigateToCreateRide={() => navigateTo('create_ride')}
            onNavigateToVehicleConfig={() => navigateTo('vehicle_config')}
            onSignOut={() => {
              setAuthSession(null);
              setUserProfile(null);
            }}
          />
        );
    }
  };

  return (
    <ErrorBoundary onReset={() => setCurrentScreen('home')}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      {renderScreen()}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
