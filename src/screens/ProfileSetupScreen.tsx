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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { UserProfile } from '../types';
import { saveUserProfile } from '../services/storage';
import { saveProfileToFirebase } from '../services/dbService';

interface ProfileSetupScreenProps {
  uid: string;
  email: string;
  _photoUrl: string;
  onProfileComplete: (profile: UserProfile) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AVATARS = [
  { id: 'av1', icon: 'account-tie', color: '#43A047' },
  { id: 'av2', icon: 'account-cowboy-hat', color: '#E65100' },
  { id: 'av3', icon: 'account-detective', color: '#1E88E5' },
  { id: 'av4', icon: 'account-graduation-cap', color: '#8E24AA' },
  { id: 'av5', icon: 'account-child', color: '#F4511E' },
];

export default function ProfileSetupScreen({
  uid,
  email,
  _photoUrl,
  onProfileComplete,
}: ProfileSetupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('av1');
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
        'Phone number must be in E.164 format (e.g. +1234567890).'
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>Let partners know who you are</Text>
        </View>

        {/* Avatar Selector */}
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
                    isSelected ? { borderColor: item.color, backgroundColor: item.color + '15' } : null,
                  ]}
                  onPress={() => setSelectedAvatarId(item.id)}
                >
                  <Icon
                    name={item.icon}
                    size={36}
                    color={isSelected ? item.color : '#9CA3AF'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Input Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Faisal Hayat"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Phone Number */}
          <Text style={styles.label}>WhatsApp Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +923001234567"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <Text style={styles.hintText}>
            Must start with country code (e.g. +92 or +1).
          </Text>

          {/* Blood Group Picker */}
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => {
              const isSelected = selectedBloodGroup === bg;
              return (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodGroupBadge, isSelected ? styles.bloodGroupBadgeActive : null]}
                  onPress={() => setSelectedBloodGroup(bg)}
                >
                  <Text
                    style={[
                      styles.bloodGroupBadgeText,
                      isSelected ? styles.bloodGroupBadgeTextActive : null,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSaveProfile} disabled={isSubmitting}>
          <Text style={styles.submitButtonText}>Save & Enter App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  avatarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  hintText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 4,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  bloodGroupBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  bloodGroupBadgeActive: {
    backgroundColor: '#E65100',
  },
  bloodGroupBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  bloodGroupBadgeTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
