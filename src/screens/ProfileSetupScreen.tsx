import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/storage';
import { saveProfileToFirebase } from '../services/dbService';

interface ProfileSetupScreenProps {
  uid: string;
  email: string;
  photoUrl: string;
  onProfileComplete: (profile: UserProfile) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AVATARS = [
  { id: 'av1', icon: 'account-tie' },
  { id: 'av2', icon: 'account-cowboy-hat' },
  { id: 'av3', icon: 'account-detective' },
  { id: 'av4', icon: 'account-graduation-cap' },
  { id: 'av5', icon: 'account-child' },
];

export default function ProfileSetupScreen({
  uid,
  email,
  photoUrl,
  onProfileComplete,
}: ProfileSetupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('av1');
  const [selectedProfileMode, setSelectedProfileMode] = useState<'passenger' | 'driver'>('passenger');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async () => {
    if (!fullName || fullName.trim().length < 2) {
      Alert.alert('Validation Error', 'Full Name must be at least 2 characters.');
      return;
    }
    const cleanPhone = phoneNumber.trim();
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      Alert.alert(
        'Validation Error',
        'Phone number must be in E.164 format (e.g. +923449793574).'
      );
      return;
    }
    if (!selectedBloodGroup) {
      Alert.alert('Validation Error', 'Please select your Blood Group.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newProfile: UserProfile = {
        uid,
        email,
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        profilePicture: selectedAvatarId,
        bloodGroup: selectedBloodGroup,
        activeProfile: selectedProfileMode,
      };

      await saveUserProfile(newProfile);
      await saveProfileToFirebase(newProfile);
      onProfileComplete(newProfile);
    } catch (error: any) {
      Alert.alert('Error Saving Profile', error.message || 'Failed to save profile details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Soft UI Elevated App Bar Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => onProfileComplete({ uid, email, fullName: '', phoneNumber: '', profilePicture: '', bloodGroup: '' })}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={20} color="#262A27" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.title}>Complete Profile</Text>
            <Text style={styles.subtitle}>Set up your personal details to get started</Text>
          </View>
        </View>

        {/* Avatar Selector Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose Avatar</Text>
          <View style={styles.avatarsRow}>
            {AVATARS.map((item) => {
              const isSelected = selectedAvatarId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.avatarWrapper,
                    isSelected ? styles.avatarWrapperActive : null,
                  ]}
                  onPress={() => setSelectedAvatarId(item.id)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={item.icon}
                    size={22}
                    color={isSelected ? '#FFFFFF' : '#262A27'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Initial Profile Mode Selector */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Initial Profile Type</Text>
          <Text style={styles.hintText}>You can switch between Passenger and Driver profiles anytime.</Text>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentOption,
                selectedProfileMode === 'passenger' ? styles.segmentActive : null,
              ]}
              onPress={() => setSelectedProfileMode('passenger')}
              activeOpacity={0.85}
            >
              <Icon
                name="account"
                size={18}
                color={selectedProfileMode === 'passenger' ? '#FFFFFF' : '#262A27'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  selectedProfileMode === 'passenger' ? styles.segmentTextActive : null,
                ]}
              >
                Passenger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentOption,
                selectedProfileMode === 'driver' ? styles.segmentActive : null,
              ]}
              onPress={() => setSelectedProfileMode('driver')}
              activeOpacity={0.85}
            >
              <Icon
                name="steering"
                size={18}
                color={selectedProfileMode === 'driver' ? '#FFFFFF' : '#262A27'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  selectedProfileMode === 'driver' ? styles.segmentTextActive : null,
                ]}
              >
                Driver
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={18} color="#8A908B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Faisal Hayat"
              placeholderTextColor="#8A908B"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Phone Number */}
          <Text style={styles.label}>WhatsApp Phone Number *</Text>
          <View style={styles.inputContainer}>
            <Icon name="phone-outline" size={18} color="#8A908B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. +923001234567"
              placeholderTextColor="#8A908B"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
          <Text style={styles.hintText}>
            Must start with country code (e.g. +92).
          </Text>

          {/* Blood Group Picker Chips */}
          <Text style={styles.label}>Blood Group *</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => {
              const isSelected = selectedBloodGroup === bg;
              return (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodGroupChip, isSelected ? styles.bloodGroupChipActive : null]}
                  onPress={() => setSelectedBloodGroup(bg)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.bloodGroupChipText,
                      isSelected ? styles.bloodGroupChipTextActive : null,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Primary Green Action Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSaveProfile}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Saving Details...' : 'Save & Enter Dashboard'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262A27',
  },
  subtitle: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E9ECE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapperActive: {
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 6,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#262A27',
  },
  hintText: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 4,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  bloodGroupChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  bloodGroupChipActive: {
    backgroundColor: '#2F9A3C',
    borderColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bloodGroupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  bloodGroupChipTextActive: {
    color: '#FFFFFF',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E9ECE9',
    borderRadius: 9999,
    padding: 4,
    marginTop: 10,
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
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#2F9A3C',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 28,
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
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
