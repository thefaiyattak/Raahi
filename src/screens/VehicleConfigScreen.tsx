import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getDriverProfile,
  saveDriverProfile,
  clearDriverProfile,
  validateProfile,
  ValidationResult,
} from '../services/storage';
import { DriverProfile } from '../types';

interface VehicleConfigScreenProps {
  onBack: () => void;
}

export default function VehicleConfigScreen({ onBack }: VehicleConfigScreenProps) {
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [defaultACStatus, setDefaultACStatus] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationResult['fieldErrors']>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await getDriverProfile();
      if (profile) {
        setVehicleName(profile.vehicleName);
        setVehicleModel(profile.vehicleModel);
        setPhoneNumber(profile.phoneNumber);
        setDefaultACStatus(profile.defaultACStatus);
        setHasExistingProfile(true);
      } else {
        setHasExistingProfile(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setFieldErrors({});
    const profile: DriverProfile = {
      vehicleName,
      vehicleModel,
      phoneNumber,
      defaultACStatus,
    };

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      // Alert first error
      const firstError = Object.values(validation.fieldErrors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    try {
      setIsSaving(true);
      await saveDriverProfile(profile);
      setHasExistingProfile(true);
      Alert.alert('Success', 'Vehicle profile saved successfully!', [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your vehicle profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await clearDriverProfile();
              setVehicleName('');
              setVehicleModel('');
              setPhoneNumber('');
              setDefaultACStatus(false);
              setHasExistingProfile(false);
              Alert.alert('Deleted', 'Profile cleared.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to clear profile.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#43A047" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Vehicle Profile</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver details</Text>

          {/* Vehicle Name */}
          <Text style={styles.label}>Vehicle Make/Name</Text>
          <TextInput
            style={[styles.input, fieldErrors.vehicleName ? styles.inputError : null]}
            placeholder="e.g. Toyota"
            placeholderTextColor="#9CA3AF"
            value={vehicleName}
            onChangeText={setVehicleName}
          />
          {fieldErrors.vehicleName && <Text style={styles.errorText}>{fieldErrors.vehicleName}</Text>}

          {/* Vehicle Model */}
          <Text style={styles.label}>Model/Year</Text>
          <TextInput
            style={[styles.input, fieldErrors.vehicleModel ? styles.inputError : null]}
            placeholder="e.g. Camry 2023"
            placeholderTextColor="#9CA3AF"
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />
          {fieldErrors.vehicleModel && <Text style={styles.errorText}>{fieldErrors.vehicleModel}</Text>}

          {/* WhatsApp Phone Number */}
          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={[styles.input, fieldErrors.phoneNumber ? styles.inputError : null]}
            placeholder="e.g. +1234567890"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          {fieldErrors.phoneNumber && <Text style={styles.errorText}>{fieldErrors.phoneNumber}</Text>}

          {/* AC Default Tier */}
          <View style={styles.switchContainer}>
            <View>
              <Text style={styles.switchLabel}>Air Conditioning (AC) Default</Text>
              <Text style={styles.switchDesc}>Start new rides with AC fare tier selected</Text>
            </View>
            <Switch
              value={defaultACStatus}
              onValueChange={setDefaultACStatus}
              trackColor={{ false: '#E5E7EB', true: '#A5D6A7' }}
              thumbColor={defaultACStatus ? '#43A047' : '#F3F4F6'}
            />
          </View>

          {/* AC Tier Badge */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, defaultACStatus ? styles.badgeAC : styles.badgeNonAC]}>
              <Icon
                name={defaultACStatus ? 'snowflake' : 'fan'}
                size={14}
                color={defaultACStatus ? '#43A047' : '#E65100'}
              />
              <Text style={[styles.badgeText, defaultACStatus ? styles.badgeTextAC : styles.badgeTextNonAC]}>
                {defaultACStatus ? 'AC (Premium Tier)' : 'Non-AC (Standard Tier)'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving ? styles.buttonDisabled : null]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasExistingProfile ? 'Update Profile' : 'Save Profile'}
            </Text>
          )}
        </TouchableOpacity>

        {hasExistingProfile && (
          <TouchableOpacity
            style={[styles.deleteButton, isSaving ? styles.buttonDisabled : null]}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Icon name="trash-can-outline" size={20} color="#EF5350" />
            <Text style={styles.deleteButtonText}>Clear Profile</Text>
          </TouchableOpacity>
        )}
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    marginTop: 12,
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switchDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-start',
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeAC: {
    backgroundColor: '#E8F5E9',
  },
  badgeNonAC: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  badgeTextAC: {
    color: '#2E7D32',
  },
  badgeTextNonAC: {
    color: '#E65100',
  },
  saveButton: {
    backgroundColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF5350',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
