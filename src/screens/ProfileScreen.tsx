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
import { saveUserProfile, getDriverProfile } from '../services/storage';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onNavigateToVehicleConfig: () => void;
  onNavigateToSettings?: () => void;
  onBack: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

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
  const [vehicleRegNumber, setVehicleRegNumber] = useState(existingVerif.vehicleRegistrationNumber || 'LHR-8822');
  const [vehicleRegUri, setVehicleRegUri] = useState<string | null>(existingVerif.vehicleRegistrationUri || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500');

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
      Alert.alert('Profile Saved! ✅', 'Your identity documents and verification details have been saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDriver = (userProfile.activeProfile || 'passenger') === 'driver';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={onBack}>
          <Icon name="arrow-left" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }, getTextStyle()]}>{t('profile')}</Text>
        <TouchableOpacity style={[styles.gearButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={onNavigateToSettings}>
          <Icon name="cog-outline" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Active Persona Header Card */}
        <View style={[styles.personaCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.personaIconContainer}>
            <Icon name={isDriver ? 'steering' : 'account'} size={22} color="#2F9A3C" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.personaTitle, { color: theme.textPrimary }, getTextStyle()]}>
                {isDriver ? t('driverProfile') : t('passengerProfile')}
              </Text>
              <View style={styles.activePill}>
                <Text style={[styles.activePillText, getTextStyle()]}>{t('activeStatus')}</Text>
              </View>
            </View>
            <Text style={[styles.personaSubText, { color: theme.textSecondary }, getTextStyle()]}>
              {isDriver ? t('driverPersonaSubText') : t('passengerPersonaSubText')}
            </Text>
          </View>
        </View>

        {/* Public Reviews Card */}
        <TouchableOpacity
          style={[styles.ratingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowRatingsModal(true)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="star" size={18} color="#2F9A3C" />
              <Text style={[styles.ratingValue, { color: theme.textPrimary }]}>4.9 / 5.0</Text>
              <View style={styles.verifiedScoreBadge}>
                <Text style={[styles.verifiedScoreText, getTextStyle()]}>{t('verifiedTraveler')}</Text>
              </View>
            </View>
            <Text style={[styles.ratingSubText, { color: theme.textSecondary }, getTextStyle()]}>
              32 {t('ratingsAndReviewsTitle')} • {t('tapForLog')}
            </Text>
          </View>
          <View style={styles.viewReviewsBtn}>
            <Text style={[styles.viewReviewsBtnText, getTextStyle()]}>{t('reviews')}</Text>
            <Icon name="chevron-right" size={16} color="#2F9A3C" />
          </View>
        </TouchableOpacity>

        {/* DRIVER SPECIFIC: Vehicle Setup Status */}
        {isDriver && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={styles.vehicleIconBadge}>
                <Icon name={hasVehicleProfile ? 'car-side' : 'car-cog'} size={20} color="#2F9A3C" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }, getTextStyle()]}>
                    {hasVehicleProfile ? t('vehicleConfig') : t('configureDriverVehicle')}
                  </Text>
                  <View style={styles.readyBadge}>
                    <Text style={[styles.readyBadgeText, getTextStyle()]}>
                      {hasVehicleProfile ? t('readyStatus') : t('requiredStatus')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }, getTextStyle()]}>
                  {hasVehicleProfile
                    ? `${driverProfile?.vehicleName || 'Toyota'} ${driverProfile?.vehicleModel || 'Corolla'} • ${driverProfile?.defaultACStatus ? t('acAvailable') : t('nonAC')}`
                    : t('vehicleSetupPrompt')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={onNavigateToVehicleConfig}
                activeOpacity={0.85}
              >
                <Icon name="pencil" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={[styles.actionBtnSmallText, getTextStyle()]}>
                  {hasVehicleProfile ? t('manageVehicle') : t('setupVehicle')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Identity & Photo Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardHeading, { color: theme.textPrimary }, getTextStyle()]}>
            {isDriver ? t('driverPhotoIdentity') : t('passengerPhotoIdentity')}
          </Text>
          <View style={styles.photoContainer}>
            <View style={styles.photoFrame}>
              {customPhotoUri ? (
                <Image source={{ uri: customPhotoUri }} style={styles.photoImage} />
              ) : (
                <Image source={{ uri: isDriver ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }} style={styles.photoImage} />
              )}
              <TouchableOpacity style={styles.cameraBadge} onPress={handlePickProfilePhoto} activeOpacity={0.85}>
                <Icon name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.userNameText, { color: theme.textPrimary }, getTextStyle()]}>
              {fullName || (isDriver ? t('driver') : t('passenger'))}
            </Text>
            <View style={styles.phoneTagRow}>
              <Text style={[styles.phoneTagText, { color: theme.textSecondary }]}>{phoneNumber || '+923449793574'}</Text>
              <Icon name="check-decagram" size={16} color="#2F9A3C" />
            </View>

            <TouchableOpacity style={[styles.updatePhotoBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border, borderWidth: 1 }]} onPress={handlePickProfilePhoto} activeOpacity={0.85}>
              <Icon name="upload" size={14} color="#2F9A3C" style={{ marginRight: 6 }} />
              <Text style={[styles.updatePhotoBtnText, getTextStyle()]}>
                {t('updateProfilePhoto')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Details Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardHeading, { color: theme.textPrimary }, getTextStyle()]}>{t('personalDetailsHeading')}</Text>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('fullName')} *</Text>
          <TextInput
            style={[styles.inputField, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Faisal Hayat"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('contactPhoneNumber')} *</Text>
          <TextInput
            style={[styles.inputField, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="e.g. +923449793574"
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* CNIC / License Document Verification Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.cardHeading, { color: theme.textPrimary, marginBottom: 0 }, getTextStyle()]}>
              {isDriver ? t('driverLicenseAndCNIC') : t('cnicIdentityVerification')}
            </Text>
            <View style={styles.verifiedStatusBadge}>
              <Text style={[styles.verifiedStatusText, getTextStyle()]}>
                {isDriver ? (licenseFrontUri ? `✓ ${t('verified')}` : t('actionRequired')) : ((cnicFrontUri && cnicBackUri) ? `✓ ${t('cnicVerified')}` : t('pendingUpload'))}
              </Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>
            {isDriver ? t('drivingLicenseNumber') : t('cnicNumber')} *
          </Text>
          <TextInput
            style={[styles.inputField, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary, marginBottom: 12 }, getTextStyle()]}
            value={isDriver ? licenseNumber : cnicNumber}
            onChangeText={isDriver ? setLicenseNumber : setCnicNumber}
            placeholder={isDriver ? 'e.g. LHR-2021-998812' : '35202-1234567-1'}
            placeholderTextColor={theme.textSecondary}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={[styles.docSubLabel, { color: theme.textSecondary }, getTextStyle()]}>{isDriver ? t('licenseFront') : t('cnicFront')}</Text>
              <TouchableOpacity
                style={[styles.docUploadBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                onPress={() => handleUploadDocument(isDriver ? 'License Front' : 'CNIC Front', isDriver ? setLicenseFrontUri : setCnicFrontUri)}
                activeOpacity={0.85}
              >
                {(isDriver ? licenseFrontUri : cnicFrontUri) ? (
                  <Image source={{ uri: (isDriver ? licenseFrontUri : cnicFrontUri)! }} style={styles.docImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Icon name="card-account-details-outline" size={24} color={theme.textSecondary} />
                    <Text style={[styles.docUploadText, { color: theme.textSecondary }, getTextStyle()]}>{t('uploadFront')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={[styles.docSubLabel, { color: theme.textSecondary }, getTextStyle()]}>{isDriver ? t('vehicleRegistration') : t('cnicBack')}</Text>
              <TouchableOpacity
                style={[styles.docUploadBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                onPress={() => handleUploadDocument(isDriver ? 'Vehicle Registration' : 'CNIC Back', isDriver ? setVehicleRegUri : setCnicBackUri)}
                activeOpacity={0.85}
              >
                {(isDriver ? vehicleRegUri : cnicBackUri) ? (
                  <Image source={{ uri: (isDriver ? vehicleRegUri : cnicBackUri)! }} style={styles.docImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Icon name={isDriver ? 'car-check' : 'card-account-details'} size={24} color={theme.textSecondary} />
                    <Text style={[styles.docUploadText, { color: theme.textSecondary }, getTextStyle()]}>{isDriver ? t('uploadDoc') : t('uploadBack')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Medical & Blood Group Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardHeading, { color: theme.textPrimary }, getTextStyle()]}>{t('medicalAndBloodGroup')}</Text>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('selectBloodGroup')}</Text>
          <View style={styles.bloodGroupRow}>
            {BLOOD_GROUPS.map((bg) => {
              const isSelected = bloodGroup === bg;
              return (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodGroupChip,
                    { backgroundColor: theme.inputBackground, borderColor: theme.border },
                    isSelected ? styles.bloodGroupChipSelected : null,
                  ]}
                  onPress={() => setBloodGroup(bg)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.bloodGroupChipText,
                      { color: isSelected ? '#FFFFFF' : theme.textPrimary },
                      isSelected ? styles.bloodGroupChipTextSelected : null,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emergency SOS Contacts */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }, getTextStyle()]}>
              {t('emergencyContactsMax3')}
            </Text>
            {emergencyContactsList.length < 3 && (
              <TouchableOpacity
                style={styles.addContactBtn}
                onPress={handleAddEmergencyContact}
                activeOpacity={0.85}
              >
                <Icon name="plus" size={14} color="#2F9A3C" style={{ marginRight: 2 }} />
                <Text style={[styles.addContactBtnText, getTextStyle()]}>{t('addNew')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {emergencyContactsList.map((contact, index) => (
            <View key={contact.id} style={[styles.contactRowBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="shield-alert-outline" size={16} color="#2F9A3C" style={{ marginRight: 8 }} />
                  <Text style={[styles.contactNameText, { color: theme.textPrimary }, getTextStyle()]}>
                    {contact.name || `${t('contact')} #${index + 1}`} {contact.relation ? `(${contact.relation})` : ''}
                  </Text>
                </View>
                <Text style={styles.contactPhoneText}>
                  {contact.phone || t('noPhoneSet')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.contactActionCircle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent('Raahi Emergency: I need urgent help!')}`)}
                  activeOpacity={0.85}
                >
                  <Icon name="message-text" size={14} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactActionCircle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  activeOpacity={0.85}
                >
                  <Icon name="phone" size={14} color="#2F9A3C" />
                </TouchableOpacity>
                {emergencyContactsList.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveEmergencyContact(contact.id)} style={{ padding: 4 }}>
                    <Icon name="trash-can-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Primary Save Button */}
        <TouchableOpacity
          style={styles.primarySaveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Icon name="content-save" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={[styles.primarySaveButtonText, getTextStyle()]}>
            {isSaving ? t('savingChanges') : t('saveProfileChanges')}
          </Text>
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
    backgroundColor: '#F2F3F2',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  personaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
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
  personaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262A27',
  },
  personaSubText: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#2F9A3C',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
  },
  ratingSubText: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 3,
  },
  verifiedScoreBadge: {
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  verifiedScoreText: {
    color: '#2F9A3C',
    fontSize: 10,
    fontWeight: '600',
  },
  viewReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  viewReviewsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F9A3C',
    marginRight: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
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
  cardHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  vehicleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  readyBadge: {
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  readyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  actionBtnSmall: {
    backgroundColor: '#2F9A3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  photoFrame: {
    width: 80,
    height: 80,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#2F9A3C',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoImage: {
    width: 74,
    height: 74,
    borderRadius: 22,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2F9A3C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262A27',
  },
  phoneTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 12,
  },
  phoneTagText: {
    fontSize: 13,
    color: '#8A908B',
  },
  updatePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
  },
  updatePhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 8,
    marginBottom: 4,
  },
  inputField: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#262A27',
  },
  verifiedStatusBadge: {
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  verifiedStatusText: {
    color: '#2F9A3C',
    fontSize: 10,
    fontWeight: '600',
  },
  docSubLabel: {
    fontSize: 11,
    color: '#8A908B',
    fontWeight: '600',
    marginBottom: 4,
  },
  docUploadBox: {
    height: 96,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  docImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docUploadText: {
    fontSize: 11,
    color: '#8A908B',
    fontWeight: '600',
    marginTop: 4,
  },
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  bloodGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  bloodGroupChipSelected: {
    backgroundColor: '#2F9A3C',
    borderColor: '#2F9A3C',
  },
  bloodGroupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  bloodGroupChipTextSelected: {
    color: '#FFFFFF',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  addContactBtnText: {
    fontSize: 11,
    color: '#2F9A3C',
    fontWeight: '600',
  },
  contactRowBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  contactNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  contactPhoneText: {
    fontSize: 12,
    color: '#2F9A3C',
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 24,
  },
  contactActionCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primarySaveButton: {
    backgroundColor: '#2F9A3C',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
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
  primarySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

