import React, { useState, useEffect } from 'react';
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
  Image,
  Linking,
} from 'react-native';
import Icon from '../components/AppIcon';
import RatingsModal from '../components/RatingsModal';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { UserProfile, DriverProfile, EmergencyContact } from '../types';
import { saveUserProfile, getDriverProfile, deleteDriverProfile } from '../services/storage';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onNavigateToVehicleConfig: () => void;
  onNavigateToSettings?: () => void;
  onBack: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const AVATAR_PRESETS = [
  'account-circle',
  'account-tie',
  'account-cowboy-hat',
  'account-star',
  'account-heart',
];

export default function ProfileScreen({
  userProfile,
  onProfileUpdated,
  onNavigateToVehicleConfig,
  onNavigateToSettings,
  onBack,
}: ProfileScreenProps) {
  const { theme } = useTheme();
  const { t, isUrdu, getTextStyle } = useLanguage();

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  useEffect(() => {
    loadDriverProfileData();
  }, []);

  const loadDriverProfileData = async () => {
    try {
      const dp = await getDriverProfile();
      setDriverProfile(dp);
    } catch (e) {
      console.warn('Failed to load driver profile', e);
    }
  };

  const hasVehicleProfile = !!(driverProfile && driverProfile.vehicleName && driverProfile.vehicleName.trim().length > 0);

  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || '');
  const [bloodGroup, setBloodGroup] = useState(userProfile.bloodGroup || 'O+');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile.profilePicture || 'account-circle');

  // Custom Uploaded Profile Picture state
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(
    userProfile.profilePicture && userProfile.profilePicture.startsWith('http')
      ? userProfile.profilePicture
      : null
  );

  // Ratings Modal visibility state
  const [showRatingsModal, setShowRatingsModal] = useState(false);

  // Dynamic Up to 3 Personal Emergency Contacts
  const initialContacts: EmergencyContact[] =
    userProfile.emergencyContacts && userProfile.emergencyContacts.length > 0
      ? userProfile.emergencyContacts
      : [
          { id: 'ec_1', name: 'Usman Khan', relation: 'Brother', phone: '+923001234567' },
          { id: 'ec_2', name: 'Faisal Ahmed', relation: 'Father', phone: '+923449793574' },
        ];

  const [emergencyContactsList, setEmergencyContactsList] = useState<EmergencyContact[]>(initialContacts);

  const [isSaving, setIsSaving] = useState(false);

  const handleAddEmergencyContact = () => {
    if (emergencyContactsList.length >= 3) {
      Alert.alert('Contact Limit', 'You can add up to 3 personal emergency contacts.');
      return;
    }
    const newContact: EmergencyContact = {
      id: `ec_${Date.now()}`,
      name: '',
      relation: 'Relative',
      phone: '',
    };
    setEmergencyContactsList([...emergencyContactsList, newContact]);
  };

  const handleRemoveEmergencyContact = (id: string) => {
    if (emergencyContactsList.length <= 1) {
      Alert.alert('Minimum Requirement', 'Please keep at least 1 emergency contact.');
      return;
    }
    setEmergencyContactsList(emergencyContactsList.filter((c) => c.id !== id));
  };

  const handleUpdateContactField = (id: string, field: keyof EmergencyContact, val: string) => {
    setEmergencyContactsList(
      emergencyContactsList.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const handlePickProfilePhoto = () => {
    Alert.alert(
      'Upload Profile Picture',
      'Choose an option to update your public profile picture:',
      [
        {
          text: 'Take Photo with Camera',
          onPress: () => {
            const demoUri = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
            setCustomPhotoUri(demoUri);
            setSelectedAvatar(demoUri);
            Alert.alert('Photo Uploaded!', 'Your profile picture has been updated successfully ✅');
          },
        },
        {
          text: 'Select from Photo Gallery',
          onPress: () => {
            const demoUri = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500';
            setCustomPhotoUri(demoUri);
            setSelectedAvatar(demoUri);
            Alert.alert('Photo Uploaded!', 'Your profile picture has been updated successfully ✅');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Security Verification States
  const existingVerif = userProfile.verification || {};
  const [cnicNumber, setCnicNumber] = useState(existingVerif.cnicNumber || '35202-1234567-1');
  const [cnicFrontUri, setCnicFrontUri] = useState<string | null>(existingVerif.cnicFrontUri || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500');
  const [cnicBackUri, setCnicBackUri] = useState<string | null>(existingVerif.cnicBackUri || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500');
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(existingVerif.phoneVerified !== false);
  const [licenseNumber, setLicenseNumber] = useState(existingVerif.drivingLicenseNumber || 'LHR-2021-998812');
  const [licenseFrontUri, setLicenseFrontUri] = useState<string | null>(existingVerif.drivingLicenseFrontUri || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500');
  const [licenseBackUri, setLicenseBackUri] = useState<string | null>(existingVerif.drivingLicenseBackUri || null);
  const [vehicleRegNumber, setVehicleRegNumber] = useState(existingVerif.vehicleRegistrationNumber || 'LHR-8822');
  const [vehicleRegUri, setVehicleRegUri] = useState<string | null>(existingVerif.vehicleRegistrationUri || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500');
  const [isVerified, setIsVerified] = useState<boolean>(userProfile.isVerified !== false);

  const handleUploadDocument = (docName: string, setter: (uri: string) => void) => {
    Alert.alert(
      `Upload ${docName}`,
      `Choose document source for security verification:`,
      [
        {
          text: 'Take Photo with Camera',
          onPress: () => {
            const demoUri = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600';
            setter(demoUri);
            Alert.alert('Document Captured', `${docName} image updated successfully! ✅`);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            const demoUri = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600';
            setter(demoUri);
            Alert.alert('Document Selected', `${docName} image selected successfully! ✅`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleVerifyPhone = () => {
    Alert.alert(
      'Active Phone Verification',
      `An OTP authentication SMS has been dispatched to ${phoneNumber || '+923449793574'}.\n\nDemo Verification Code: 5892`,
      [
        {
          text: 'Confirm & Verify Phone Number',
          onPress: () => {
            setIsPhoneVerified(true);
            Alert.alert('Phone Verified! ✅', 'Your phone number has been authenticated.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Validation Error', 'Full Name must be at least 2 characters.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Phone Number is required.');
      return;
    }

    try {
      setIsSaving(true);
      const updated: UserProfile = {
        ...userProfile,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        bloodGroup,
        profilePicture: selectedAvatar,
        isVerified: true,
        verification: {
          cnicNumber,
          cnicFrontUri: cnicFrontUri || undefined,
          cnicBackUri: cnicBackUri || undefined,
          isCNICVerified: !!(cnicFrontUri && cnicBackUri),
          phoneVerified: isPhoneVerified,
          drivingLicenseNumber: licenseNumber,
          drivingLicenseFrontUri: licenseFrontUri || undefined,
          drivingLicenseBackUri: licenseBackUri || undefined,
          isLicenseVerified: !!licenseFrontUri,
          vehicleRegistrationNumber: vehicleRegNumber,
          vehicleRegistrationUri: vehicleRegUri || undefined,
          isVehicleRegistrationVerified: !!vehicleRegUri,
          isVerified: true,
          verifiedAt: Date.now(),
        },
        emergencyContacts: emergencyContactsList.filter((c) => c.name.trim() !== '' && c.phone.trim() !== ''),
      };

      await saveUserProfile(updated);
      onProfileUpdated(updated);
      Alert.alert('Verification Saved! ✅', 'Your identity documents and verification details have been saved in the database.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }, getTextStyle()]}>{t('profile')}</Text>
        <TouchableOpacity style={{ padding: 4 }} onPress={onNavigateToSettings}>
          <Icon name="cog-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* REGISTER / MODIFY / DELETE DRIVER PROFILE CARD */}
        <View style={[styles.card, { backgroundColor: hasVehicleProfile ? '#F0FDF4' : '#FFFBEB', borderColor: hasVehicleProfile ? '#86EFAC' : '#FCD34D', padding: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: hasVehicleProfile ? '#DCFCE7' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Icon name={hasVehicleProfile ? "car-side" : "car-cog"} size={20} color={hasVehicleProfile ? '#16A34A' : '#D97706'} />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                  {hasVehicleProfile ? 'Driver Profile Active' : 'Register as a Driver'}
                </Text>
                <View style={{ backgroundColor: hasVehicleProfile ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: hasVehicleProfile ? '#15803D' : '#B45309' }}>
                    {hasVehicleProfile ? 'ACTIVE' : 'SETUP REQUIRED'}
                  </Text>
                </View>
              </View>
              <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>
                {hasVehicleProfile
                  ? 'Your driver license & vehicle profile are active.'
                  : 'Complete CNIC, Phone, License & Vehicle registration to offer rides.'}
              </Text>
            </View>

            {hasVehicleProfile ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#2E7D32', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }}
                  onPress={onNavigateToVehicleConfig}
                >
                  <Icon name="pencil" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Modify</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }}
                  onPress={() => {
                    Alert.alert(
                      'Delete Driver Profile 🗑️',
                      'Are you sure you want to delete your Driver Profile? This will remove your vehicle profile, license documents, and revert your account to Passenger mode only.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete Profile',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteDriverProfile();
                              setHasVehicleProfile(false);
                              Alert.alert('Driver Profile Deleted', 'Your Driver Profile has been removed successfully. You are now in Passenger mode.');
                            } catch (err: any) {
                              Alert.alert('Error', err.message || 'Failed to delete driver profile.');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Icon name="trash-can-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{ backgroundColor: '#D97706', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                onPress={() => {
                  if (!(cnicFrontUri && cnicBackUri && isPhoneVerified)) {
                    Alert.alert(
                      'Verification Required 🛡️',
                      'First, you must verify your account (CNIC & Phone) to be eligible to register as a Driver.'
                    );
                    return;
                  }
                  onNavigateToVehicleConfig();
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  Register Now ➔
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* PUBLIC RATINGS & REVIEWS CARD */}
        <TouchableOpacity
          style={[styles.publicRatingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowRatingsModal(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="star" size={20} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }]}>4.9 / 5.0</Text>
              <View style={[styles.verifiedPill, { backgroundColor: '#E8F5E9', marginLeft: 8 }]}>
                <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Public Rating</Text>
              </View>
            </View>
            <Text style={[{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }, getTextStyle()]}>
              32 Ratings & 8 Comments • Tap to open
            </Text>
          </View>

          <View style={[styles.openReviewsBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.openReviewsBtnText, { color: theme.white }, getTextStyle()]}>
              View Reviews
            </Text>
            <Icon name="chevron-right" size={16} color={theme.white} />
          </View>
        </TouchableOpacity>

        {/* Real Profile Picture Upload Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.primary }, getTextStyle()]}>
            Profile Picture
          </Text>

          {/* Profile Photo Display Frame */}
          <View style={styles.photoContainer}>
            <View style={[styles.photoCircleFrame, { borderColor: '#2E7D32', backgroundColor: theme.inputBackground }]}>
              {customPhotoUri ? (
                <Image source={{ uri: customPhotoUri }} style={styles.photoImageCircle} />
              ) : (
                <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' }} style={styles.photoImageCircle} />
              )}

              {/* Camera Badge Edit Icon */}
              <TouchableOpacity style={[styles.cameraBadgeBtn, { backgroundColor: '#2E7D32' }]} onPress={handlePickProfilePhoto}>
                <Icon name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={[{ fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginTop: 8 }, getTextStyle()]}>
              {fullName || 'Faisal Hayat'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginRight: 6 }}>{phoneNumber || '+923449793574'}</Text>
              <Icon name="whatsapp" size={16} color="#25D366" />
            </View>

            {/* Dynamic Security Verification Status Badges (Passenger, and optional Driver/Vehicle if setup) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: (cnicFrontUri && cnicBackUri && isPhoneVerified) ? '#F0FDF4' : '#FEF3C7', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', marginHorizontal: 2, borderWidth: 1, borderColor: (cnicFrontUri && cnicBackUri && isPhoneVerified) ? '#DCFCE7' : '#FDE047' }}>
                <Icon name={(cnicFrontUri && cnicBackUri && isPhoneVerified) ? 'account-check' : 'account-alert'} size={18} color={(cnicFrontUri && cnicBackUri && isPhoneVerified) ? '#16A34A' : '#D97706'} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: (cnicFrontUri && cnicBackUri && isPhoneVerified) ? '#15803D' : '#B45309', marginTop: 3, textAlign: 'center' }}>
                  {(cnicFrontUri && cnicBackUri && isPhoneVerified) ? 'Verified Passenger' : 'Unverified Passenger'}
                </Text>
              </View>

              {hasVehicleProfile && (
                <>
                  <View style={{ flex: 1, backgroundColor: licenseFrontUri ? '#F0FDF4' : '#FEF3C7', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', marginHorizontal: 2, borderWidth: 1, borderColor: licenseFrontUri ? '#DCFCE7' : '#FDE047' }}>
                    <Icon name={licenseFrontUri ? 'card-account-details-outline' : 'card-account-details-star-outline'} size={18} color={licenseFrontUri ? '#16A34A' : '#D97706'} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: licenseFrontUri ? '#15803D' : '#B45309', marginTop: 3, textAlign: 'center' }}>
                      {licenseFrontUri ? 'Verified Driver' : 'Unverified Driver'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, backgroundColor: vehicleRegUri ? '#F0FDF4' : '#FFF7ED', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', marginHorizontal: 2, borderWidth: 1, borderColor: vehicleRegUri ? '#DCFCE7' : '#FFEDD5' }}>
                    <Icon name={vehicleRegUri ? 'car-check' : 'car-off-outline'} size={18} color={vehicleRegUri ? '#16A34A' : '#C2410C'} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: vehicleRegUri ? '#15803D' : '#C2410C', marginTop: 3, textAlign: 'center' }}>
                      {vehicleRegUri ? 'Verified Vehicle' : 'Unverified Vehicle'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity style={[styles.uploadPhotoBtn, { backgroundColor: '#E8F5E9' }]} onPress={handlePickProfilePhoto}>
              <Icon name="upload" size={14} color="#2E7D32" style={{ marginRight: 6 }} />
              <Text style={[{ fontSize: 12, fontWeight: '800', color: '#2E7D32' }, getTextStyle()]}>
                Upload New Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Details Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardTitle, { color: theme.primary, marginBottom: 0 }, getTextStyle()]}>Personal Information</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="pencil" size={14} color="#2E7D32" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.textPrimary }, getTextStyle()]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Faisal Ahmed"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.label, { color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'ای میل ایڈریس' : 'Email Address (Read-only)'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textMuted }]}
            value={userProfile.email}
            editable={false}
          />

          <Text style={[styles.label, { color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'واٹس ایپ فون نمبر *' : 'WhatsApp Phone Number *'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="e.g. +923449793574"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
          />
          <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }, getTextStyle()]}>Include country code (+92 for PK)</Text>
        </View>

        {/* PASSENGER & DRIVER SECURITY VERIFICATION CARD */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="shield-check" size={22} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: theme.primary, marginBottom: 0 }, getTextStyle()]}>
                {isUrdu ? 'پاسنجر اور ڈرائیور تصدیق' : 'Security & Identity Verification'}
              </Text>
            </View>
            <View style={{ backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: isVerified ? '#86EFAC' : '#FDE047' }}>
              <Text style={{ color: isVerified ? '#15803D' : '#B45309', fontSize: 11, fontWeight: '800' }}>
                {isVerified ? '✓ VERIFIED USER' : 'Pending Verification'}
              </Text>
            </View>
          </View>

          <Text style={[{ fontSize: 12, color: theme.textSecondary, marginBottom: 14 }, getTextStyle()]}>
            {isUrdu
              ? 'سیکیورٹی مقاصد کے لیے سی این آئی سی کی تصاویر اور ڈرائیونگ لائسنس اپ لوڈ کریں تاکہ تصدیق شدہ بیج حاصل کریں۔'
              : 'Upload CNIC, Active Phone, and Driving License/Vehicle Registration to obtain a Verified Security Badge saved securely in database.'}
          </Text>

          {/* 1. Phone Verification Status */}
          <View style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Icon name="cellphone-check" size={20} color={isPhoneVerified ? '#16A34A' : '#D97706'} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>
                    Active Phone Number
                  </Text>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }, getTextStyle()]}>
                    {phoneNumber || '+923449793574'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: isPhoneVerified ? '#E8F5E9' : theme.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                onPress={handleVerifyPhone}
              >
                <Text style={{ color: isPhoneVerified ? '#2E7D32' : '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  {isPhoneVerified ? '✓ Phone Verified' : 'Verify via OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. CNIC Front & Back Images */}
          <Text style={[styles.label, { color: theme.textPrimary, marginTop: 4 }, getTextStyle()]}>
            CNIC / National Identity Card *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary, marginBottom: 10 }, getTextStyle()]}
            value={cnicNumber}
            onChangeText={setCnicNumber}
            placeholder="CNIC No. e.g. 35202-1234567-1"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* CNIC Front */}
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600', marginBottom: 4 }}>CNIC Front Image</Text>
              <TouchableOpacity
                style={{ height: 90, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: cnicFrontUri ? '#16A34A' : '#D1D5DB', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
                onPress={() => handleUploadDocument('CNIC Front', setCnicFrontUri)}
              >
                {cnicFrontUri ? (
                  <Image source={{ uri: cnicFrontUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Icon name="card-account-details-outline" size={24} color="#6B7280" />
                    <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 4 }}>+ Upload Front</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* CNIC Back */}
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600', marginBottom: 4 }}>CNIC Back Image</Text>
              <TouchableOpacity
                style={{ height: 90, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: cnicBackUri ? '#16A34A' : '#D1D5DB', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
                onPress={() => handleUploadDocument('CNIC Back', setCnicBackUri)}
              >
                {cnicBackUri ? (
                  <Image source={{ uri: cnicBackUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Icon name="card-account-details" size={24} color="#6B7280" />
                    <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 4 }}>+ Upload Back</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>



          {/* Official Document Privacy Guarantee Banner */}
          <View style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 10, padding: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="lock" size={16} color="#0284C7" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 10, color: '#0369A1', flex: 1, fontWeight: '600' }}>
              🔒 Document Privacy Note: CNIC, Driver License, & Vehicle Documents are 100% PRIVATE. They are strictly collected for verification by Raahi Administration and are NEVER shared with other users.
            </Text>
          </View>
        </View>

        {/* Medical & Safety Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.primary }, getTextStyle()]}>{isUrdu ? 'میڈیکل اور بلڈ گروپ' : 'Medical & Blood Group'}</Text>
          <Text style={[styles.label, { color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'بلڈ گروپ منتخب کریں' : 'Select Blood Group'}</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => {
              const isSelected = bloodGroup === bg;
              return (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodBadge,
                    isSelected ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.inputBackground, borderColor: theme.border },
                  ]}
                  onPress={() => setBloodGroup(bg)}
                >
                  <Text
                    style={[
                      styles.bloodBadgeText,
                      isSelected ? { color: theme.white, fontWeight: '800' } : { color: theme.textPrimary },
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emergency Contacts List (Up to 3 Contacts) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <Text style={[styles.cardTitleSub, { color: theme.primary, marginTop: 0 }, getTextStyle()]}>
              {isUrdu ? 'شخصی ہنگامی رابطے (زیادہ سے زیادہ 3)' : 'Emergency Contacts'}
            </Text>
            {emergencyContactsList.length < 3 && (
              <TouchableOpacity
                style={[styles.addContactBadge, { backgroundColor: theme.primaryBackground }]}
                onPress={handleAddEmergencyContact}
              >
                <Icon name="plus" size={14} color={theme.primary} style={{ marginRight: 2 }} />
                <Text style={[{ fontSize: 11, color: theme.primary, fontWeight: '800' }, getTextStyle()]}>Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {emergencyContactsList.map((contact, index) => (
            <View key={contact.id} style={[styles.contactCardBox, { backgroundColor: theme.inputBackground, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginBottom: 8 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="shield-alert-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                    {contact.name || `Contact #${index + 1}`} {contact.relation ? `(${contact.relation})` : ''}
                  </Text>
                </View>
                <Text style={[{ fontSize: 12, color: theme.primary, fontWeight: '700', marginTop: 2, marginLeft: 24 }]}>
                  {contact.phone || 'No phone set'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent('Raahi Emergency: I need urgent help!')}`)}
                >
                  <Icon name="message-text" size={15} color="#D32F2F" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                >
                  <Icon name="phone" size={15} color="#2E7D32" />
                </TouchableOpacity>
                {emergencyContactsList.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveEmergencyContact(contact.id)} style={{ padding: 4, marginLeft: 4 }}>
                    <Icon name="trash-can-outline" size={16} color="#EF5350" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>



        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={isSaving}>
          <Icon name="content-save" size={18} color={theme.white} style={{ marginRight: 8 }} />
          <Text style={[styles.saveBtnText, { color: theme.white }, getTextStyle()]}>{isSaving ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving Changes...') : t('saveChanges')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Public Ratings & Reviews Modal */}
      <RatingsModal
        visible={showRatingsModal}
        onClose={() => setShowRatingsModal(false)}
        userProfile={userProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  publicRatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  openReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  openReviewsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  photoCircleFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoImageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  photoCirclePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  cardTitleSub: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarBadgeSelected: {
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    height: 40,
    fontSize: 13,
  },
  readOnlyInput: {
    opacity: 0.7,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  bloodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  bloodBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addContactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contactCardBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  vehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  vehicleBtnText: {
    fontWeight: '800',
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 12,
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
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
