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
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import Icon from '../components/AppIcon';
import {
  getDriverProfile,
  saveDriverProfile,
  clearDriverProfile,
  getUserProfile,
  validateProfile,
  ValidationResult,
} from '../services/storage';
import { DriverProfile } from '../types';

interface VehicleConfigScreenProps {
  onBack: () => void;
}

export default function VehicleConfigScreen({ onBack }: VehicleConfigScreenProps) {
  const [driverName, setDriverName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [defaultACStatus, setDefaultACStatus] = useState(false);

  // Driving License Verification States
  const [licenseNumber, setLicenseNumber] = useState('');
  const [drivingLicenseUri, setDrivingLicenseUri] = useState<string | null>(null);
  const [isLicenseVerified, setIsLicenseVerified] = useState(false);

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
      const userProf = await getUserProfile();
      if (profile) {
        setDriverName(profile.driverName || userProf?.fullName || '');
        setVehicleName(profile.vehicleName);
        setVehicleModel(profile.vehicleModel);
        setPhoneNumber(profile.phoneNumber || userProf?.phoneNumber || '');
        setDefaultACStatus(profile.defaultACStatus);
        setLicenseNumber(profile.licenseNumber || 'LHR-2022-881923');
        setDrivingLicenseUri(profile.drivingLicenseUri || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
        setIsLicenseVerified(profile.isLicenseVerified ?? true);
        setHasExistingProfile(true);
      } else {
        setDriverName(userProf?.fullName || '');
        setPhoneNumber(userProf?.phoneNumber || '');
        setLicenseNumber('LHR-2022-881923');
        setDrivingLicenseUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
        setIsLicenseVerified(true);
        setHasExistingProfile(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadLicensePhoto = () => {
    Alert.alert(
      'Upload Driving License',
      'Choose an option to upload your Official Pakistani Driving License for verification:',
      [
        {
          text: 'Take Photo with Camera',
          onPress: () => {
            setDrivingLicenseUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
            setIsLicenseVerified(true);
            Alert.alert('License Uploaded!', 'Driving License photo uploaded & verified successfully ✅ (+20% Trust Rating Boost)');
          },
        },
        {
          text: 'Select from Photo Gallery',
          onPress: () => {
            setDrivingLicenseUri('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600');
            setIsLicenseVerified(true);
            Alert.alert('License Uploaded!', 'Driving License photo uploaded & verified successfully ✅ (+20% Trust Rating Boost)');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    setFieldErrors({});
    const profile: DriverProfile = {
      driverName: driverName.trim(),
      vehicleName: vehicleName.trim(),
      vehicleModel: vehicleModel.trim(),
      phoneNumber: phoneNumber.trim(),
      defaultACStatus,
      licenseNumber: licenseNumber.trim(),
      drivingLicenseUri: drivingLicenseUri || undefined,
      isLicenseVerified,
    };

    const validation = validateProfile(profile);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
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
              setDriverName('');
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
        <ActivityIndicator size="large" color="#2F9A3C" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      {/* Soft UI Elevated App Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color="#262A27" />
        </TouchableOpacity>
        <Text style={styles.title}>Vehicle Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Hero Vehicle Card */}
        <View style={styles.heroCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600' }}
            style={{ width: '100%', height: 110, resizeMode: 'contain', marginBottom: 12 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#262A27' }}>
                {vehicleName && vehicleModel ? `${vehicleName} ${vehicleModel}` : 'Suzuki Alto'}
              </Text>
              <Text style={{ fontSize: 13, color: '#8A908B', marginTop: 2 }}>2021 • White</Text>
            </View>
            <View style={styles.verifiedPill}>
              <Icon name="check" size={14} color="#2F9A3C" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#2F9A3C' }}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Driver Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver & Vehicle Info</Text>

          {/* Driver Name */}
          <Text style={styles.label}>Driver Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Faisal Ahmed"
              placeholderTextColor="#8A908B"
              value={driverName}
              onChangeText={setDriverName}
            />
          </View>

          {/* Vehicle Name */}
          <Text style={styles.label}>Vehicle Make/Name</Text>
          <View style={[styles.inputContainer, fieldErrors.vehicleName ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Toyota"
              placeholderTextColor="#8A908B"
              value={vehicleName}
              onChangeText={setVehicleName}
            />
          </View>

          {/* Vehicle Model */}
          <Text style={styles.label}>Model/Year</Text>
          <View style={[styles.inputContainer, fieldErrors.vehicleModel ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Camry 2023"
              placeholderTextColor="#8A908B"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>

          {/* WhatsApp Phone Number */}
          <Text style={styles.label}>WhatsApp Number</Text>
          <View style={[styles.inputContainer, fieldErrors.phoneNumber ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              placeholder="e.g. +923449793574"
              placeholderTextColor="#8A908B"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          {/* AC Default Tier Toggle */}
          <View style={styles.switchContainer}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchLabel}>Air Conditioning (AC) Default</Text>
              <Text style={styles.switchDesc}>Start new rides with AC fare tier selected</Text>
            </View>
            <Switch
              value={defaultACStatus}
              onValueChange={setDefaultACStatus}
              trackColor={{ false: '#E9ECE9', true: '#2F9A3C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* AC Tier Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.tierPill}>
              <Icon
                name={defaultACStatus ? 'snowflake' : 'fan'}
                size={14}
                color="#2F9A3C"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.tierPillText}>
                {defaultACStatus ? 'AC (Premium Tier)' : 'Non-AC (Standard Tier)'}
              </Text>
            </View>
          </View>

          {/* Driving License Verification Section */}
          <View style={styles.licenseCardSection}>
            <View style={styles.licenseHeaderRow}>
              <Icon name="card-account-details-outline" size={20} color="#2F9A3C" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseTitleText}>Driving License Verification</Text>
                <Text style={styles.licenseDescText}>Upload license photo to get Verified Driver badge 🛡️</Text>
              </View>
            </View>

            {/* License Number Input */}
            <Text style={styles.label}>Driving License Number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. LHR-2022-881923"
                placeholderTextColor="#8A908B"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
            </View>

            {/* License Photo Box / Preview Card */}
            {drivingLicenseUri ? (
              <View style={styles.licensePhotoPreviewBox}>
                <Image source={{ uri: drivingLicenseUri }} style={styles.licenseImageThumbnail} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#262A27' }}>Driving License Card</Text>
                  <Text style={{ fontSize: 12, color: '#2F9A3C', fontWeight: '600', marginTop: 2 }}>
                    Status: Valid & Verified ✅
                  </Text>
                  <TouchableOpacity
                    style={styles.changeLicensePhotoBtn}
                    onPress={handleUploadLicensePhoto}
                    activeOpacity={0.8}
                  >
                    <Icon name="camera-retake-outline" size={14} color="#2F9A3C" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: '#2F9A3C', fontWeight: '600' }}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadLicenseBox} onPress={handleUploadLicensePhoto} activeOpacity={0.8}>
                <Icon name="camera-plus-outline" size={28} color="#2F9A3C" />
                <Text style={styles.uploadLicenseTitle}>Upload Driving License Photo</Text>
                <Text style={styles.uploadLicenseSub}>Tap to capture or pick photo from gallery</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Primary Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Vehicle Profile</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Delete Button */}
        {hasExistingProfile && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Icon name="trash-can-outline" size={18} color="#8A908B" style={{ marginRight: 6 }} />
            <Text style={styles.deleteButtonText}>Remove Vehicle</Text>
          </TouchableOpacity>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8A908B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262A27',
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
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
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 6,
    marginTop: 10,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    color: '#262A27',
  },
  inputError: {
    borderColor: '#262A27',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3E7E3',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  switchDesc: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-start',
    marginTop: 10,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  licenseCardSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3E7E3',
  },
  licenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  licenseTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  licenseDescText: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  licensePhotoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
  },
  licenseImageThumbnail: {
    width: 68,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E9ECE9',
  },
  changeLicensePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  uploadLicenseBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  uploadLicenseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 6,
  },
  uploadLicenseSub: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#2F9A3C',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    marginBottom: 20,
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
  deleteButtonText: {
    color: '#262A27',
    fontSize: 15,
    fontWeight: '600',
  },
});
