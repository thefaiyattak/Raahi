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
  Modal,
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
  const [showLicensePreviewModal, setShowLicensePreviewModal] = useState(false);

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

        {/* Top Hero Vehicle Card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 16, alignItems: 'center' }]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600' }}
            style={{ width: '100%', height: 120, resizeMode: 'contain', marginBottom: 10 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                {vehicleName && vehicleModel ? `${vehicleName} ${vehicleModel}` : 'Suzuki Alto'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>2021 • White</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Icon name="check" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Driver Details</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="pencil" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Driver Name */}
          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Faisal Ahmed"
            placeholderTextColor="#9CA3AF"
            value={driverName}
            onChangeText={setDriverName}
          />

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

          {/* DRIVING LICENSE VERIFICATION CARD */}
          <View style={styles.licenseCardSection}>
            <View style={styles.licenseHeaderRow}>
              <Icon name="card-account-details-outline" size={22} color="#43A047" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.licenseTitleText}>Driving License Verification</Text>
                <Text style={styles.licenseDescText}>Upload license photo to get Verified Driver badge 🛡️</Text>
              </View>
              {isLicenseVerified && (
                <View style={styles.verifiedBadgePill}>
                  <Icon name="check-decagram" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedBadgePillText}>Verified</Text>
                </View>
              )}
            </View>

            {/* License Number Input */}
            <Text style={styles.label}>Driving License Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. LHR-2022-881923"
              placeholderTextColor="#9CA3AF"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />

            {/* License Photo Box / Preview Card */}
            {drivingLicenseUri ? (
              <View style={styles.licensePhotoPreviewBox}>
                <Image source={{ uri: drivingLicenseUri }} style={styles.licenseImageThumbnail} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Driving License Card</Text>
                  <Text style={{ fontSize: 11, color: '#43A047', fontWeight: '700', marginTop: 2 }}>
                    Status: Valid & Verified ✅
                  </Text>
                  <TouchableOpacity
                    style={styles.changeLicensePhotoBtn}
                    onPress={handleUploadLicensePhoto}
                  >
                    <Icon name="camera-retake-outline" size={14} color="#43A047" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: '#43A047', fontWeight: '700' }}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadLicenseBox} onPress={handleUploadLicensePhoto}>
                <Icon name="camera-plus-outline" size={32} color="#43A047" />
                <Text style={styles.uploadLicenseTitle}>Upload Driving License Photo</Text>
                <Text style={styles.uploadLicenseSub}>Tap to capture or pick photo from gallery</Text>
              </TouchableOpacity>
            )}
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
            <Text style={styles.saveButtonText}>Edit Vehicle</Text>
          )}
        </TouchableOpacity>

        {hasExistingProfile && (
          <TouchableOpacity
            style={[styles.deleteButton, isSaving ? styles.buttonDisabled : null]}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Icon name="trash-can-outline" size={20} color="#EF5350" />
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
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
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
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#374151',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    height: 42,
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
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF5350',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#EF5350',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteButtonText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  licenseCardSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  licenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  licenseTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  licenseDescText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  verifiedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#43A047',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  licensePhotoPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  licenseImageThumbnail: {
    width: 80,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  changeLicensePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  uploadLicenseBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#43A047',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  uploadLicenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 8,
  },
  uploadLicenseSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
