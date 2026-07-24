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
  onLoginSuccess: (session: AuthSession) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      const session = await signInWithGoogle();
      onLoginSuccess(session);
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
      onLoginSuccess(session);
    } catch (error: any) {
      Alert.alert('Sign-In Error', 'Mock Sign-in failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Icon name="car-multiple" size={64} color="#43A047" />
          </View>
          <Text style={styles.appName}>Raahi</Text>
          <Text style={styles.tagline}>Your Privacy-First Journey Partner</Text>
        </View>

        {/* Info/Features Card */}
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <Icon name="shield-check-outline" size={24} color="#43A047" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Privacy-First Carpooling</Text>
              <Text style={styles.featureDesc}>All trip communications and matching happen directly via WhatsApp links.</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Icon name="database-off-outline" size={24} color="#E65100" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Zero Database Overhead</Text>
              <Text style={styles.featureDesc}>No personal tracking database. Fares are calculated dynamically from secure sheets.</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionContainer}>
          {isLoggingIn ? (
            <ActivityIndicator size="large" color="#43A047" style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                <Icon name="google" size={24} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.googleButtonText}>Sign in with Gmail</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mockButton} onPress={handleMockSignIn}>
                <Icon name="flask-outline" size={20} color="#E65100" style={styles.buttonIcon} />
                <Text style={styles.mockButtonText}>Direct Emulator Sign-In (Mock)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>Developed by fyntech • Version 1.1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  googleButton: {
    backgroundColor: '#43A047',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mockButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E65100',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockButtonText: {
    color: '#E65100',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 10,
  },
});
