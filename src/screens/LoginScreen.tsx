import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import { signInWithGoogle, mockSignIn, AuthSession } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession, initialMode?: 'passenger' | 'driver') => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [initialMode, setInitialMode] = useState<'passenger' | 'driver'>('passenger');

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const session = await signInWithGoogle();
      onLoginSuccess(session, initialMode);
    } catch (error: any) {
      Alert.alert('Sign-In Error', error.message || 'Google Sign-in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMockSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const session = await mockSignIn('emulator.user@gmail.com');
      onLoginSuccess(session, initialMode);
    } catch (error: any) {
      Alert.alert('Sign-In Error', 'Mock Sign-in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      <View style={styles.container}>
        {/* Elevated Soft UI Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoElevatedContainer}>
            <Icon name="routes" size={32} color="#2F9A3C" />
          </View>
          <Text style={styles.appName}>Raahi</Text>
          <Text style={styles.tagline}>Smart Intercity Carpooling & Ride Sharing</Text>
          <View style={styles.taglinePill}>
            <Text style={styles.urduTagline}>راہی — اپنا سفر، اپنا انتخاب</Text>
          </View>
        </View>

        {/* Soft UI Persona Card with Segmented Selector */}
        <View style={styles.roleCard}>
          <Text style={styles.roleCardTitle}>Choose Your Persona</Text>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentOption,
                initialMode === 'passenger' ? styles.segmentActive : styles.segmentInactive,
              ]}
              onPress={() => setInitialMode('passenger')}
              activeOpacity={0.85}
            >
              <Icon
                name="account"
                size={18}
                color={initialMode === 'passenger' ? '#FFFFFF' : '#262A27'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  initialMode === 'passenger' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                Passenger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentOption,
                initialMode === 'driver' ? styles.segmentActive : styles.segmentInactive,
              ]}
              onPress={() => setInitialMode('driver')}
              activeOpacity={0.85}
            >
              <Icon
                name="steering"
                size={18}
                color={initialMode === 'driver' ? '#FFFFFF' : '#262A27'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  initialMode === 'driver' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                Driver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionContainer}>
          {isLoggingIn ? (
            <ActivityIndicator size="small" color="#2F9A3C" style={styles.loader} />
          ) : (
            <>
              {/* Primary Green Action Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
              >
                <Icon name="google" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              {/* Secondary White Soft Button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleMockSignIn}
                activeOpacity={0.85}
              >
                <Icon name="flask-outline" size={18} color="#262A27" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Direct Emulator Sign-In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>Secure verified intercity transit • v2.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F3F2',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoElevatedContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  appName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#262A27',
    letterSpacing: -0.2,
  },
  tagline: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 4,
    textAlign: 'center',
  },
  taglinePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  urduTagline: {
    fontSize: 12,
    color: '#2F9A3C',
    fontWeight: '600',
    textAlign: 'center',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    marginVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 12,
  },
  segmentedContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#E9ECE9',
    borderRadius: 9999,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  segmentActive: {
    backgroundColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentInactive: {
    backgroundColor: 'transparent',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    color: '#262A27',
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#2F9A3C',
    width: '100%',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondaryButtonText: {
    color: '#262A27',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#8A908B',
    marginBottom: 4,
  },
});
