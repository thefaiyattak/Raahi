import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  TextInput,
  Clipboard,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import MapLocationPickerModal from '../components/MapLocationPickerModal';
import { showThemedAlert } from '../context/AlertContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getDriverProfile, getUserProfile } from '../services/storage';
import { fetchRoutes, getUniqueLocations, matchRoute } from '../services/sheetService';
import { saveOfferRidePostLocal } from '../services/dbService';
import { checkAndNotifyMatchingPost } from '../services/notificationService';
import { openWhatsApp } from '../services/deepLinkService';
import { DriverProfile, RouteConfig, OfferRidePost } from '../types';

interface CreateRideScreenProps {
  initialFrom?: string;
  initialTo?: string;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

export default function CreateRideScreen({
  initialFrom = '',
  initialTo = '',
  onBack,
  onNavigateToProfile,
}: CreateRideScreenProps) {
  const { theme } = useTheme();
  const { t, isUrdu, getTextStyle } = useLanguage();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Sheets data
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Form State initialized with picked filter locations
  const [selectedOrigin, setSelectedOrigin] = useState<string>(initialFrom);
  const [originDetail, setOriginDetail] = useState<string>('');
  
  const [selectedDestination, setSelectedDestination] = useState<string>(initialTo);
  const [destinationDetail, setDestinationDetail] = useState<string>('');
  
  const [isAC, setIsAC] = useState(false);
  const [seatsAvailable, setSeatsAvailable] = useState('3');
  const [departureTime, setDepartureTime] = useState('14:00 to 15:00');

  // Dropdown Modal helper state
  const [modalVisible, setModalVisible] = useState(false);
  const [activePicker, setActivePicker] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Matched Route
  const [matchedRouteConfig, setMatchedRouteConfig] = useState<RouteConfig | null>(null);

  useEffect(() => {
    loadProfileAndRoutes();
  }, []);

  const loadProfileAndRoutes = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await getDriverProfile();
      if (profile) {
        setDriverProfile(profile);
        setIsAC(profile.defaultACStatus);
      }

      setLoadingRoutes(true);
      const sheetRoutes = await fetchRoutes();
      setRoutes(sheetRoutes);
      const uniqueLocs = getUniqueLocations(sheetRoutes);
      setLocations(uniqueLocs);
    } catch (error: any) {
      Alert.alert('Initialization Failed', 'Failed to load routes from Google Sheet.');
    } finally {
      setIsLoadingProfile(false);
      setLoadingRoutes(false);
    }
  };

  // Run matching when selection changes
  useEffect(() => {
    if (selectedOrigin && selectedDestination) {
      const match = matchRoute(routes, selectedOrigin, selectedDestination);
      setMatchedRouteConfig(match);
    } else {
      setMatchedRouteConfig(null);
    }
  }, [selectedOrigin, selectedDestination, routes]);

  const openPicker = (type: 'origin' | 'destination') => {
    setActivePicker(type);
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelectLocation = (loc: string) => {
    if (activePicker === 'origin') {
      setSelectedOrigin(loc);
    } else if (activePicker === 'destination') {
      setSelectedDestination(loc);
    }
    setModalVisible(false);
    setActivePicker(null);
  };

  if (isLoadingProfile || loadingRoutes) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F9A3C" />
        <Text style={styles.loadingText}>Fetching configured routes...</Text>
      </View>
    );
  }

  if (!driverProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Icon name="arrow-left" size={20} color="#262A27" />
          </TouchableOpacity>
          <Text style={[styles.title, getTextStyle()]}>
            {isUrdu ? 'سفر کی پیشکش تخلیق کریں' : 'Create Ride Offer'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="car-off" size={32} color="#8A908B" />
          </View>
          <Text style={styles.emptyTitle}>No Vehicle Profile</Text>
          <Text style={styles.emptyText}>
            You must configure your vehicle make, model, and WhatsApp number before you can offer rides.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onNavigateToProfile} activeOpacity={0.85}>
            <Text style={styles.emptyButtonText}>Setup Vehicle Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const calculatedFare = matchedRouteConfig ? (isAC ? matchedRouteConfig.acFare : matchedRouteConfig.nonAcFare) : 0;

  const handlePostRideOffer = async () => {
    if (!selectedOrigin || !selectedDestination || !driverProfile || !matchedRouteConfig) {
      Alert.alert('Validation Error', 'Please select a valid origin and destination route.');
      return;
    }

    try {
      const userProf = await getUserProfile();
      const now = Date.now();
      const newPost: OfferRidePost = {
        id: 'offer_' + now,
        driverUid: userProf?.uid || driverProfile.phoneNumber,
        driverName: driverProfile.driverName || userProf?.fullName || 'Driver',
        driverPhone: userProf?.phoneNumber || driverProfile.phoneNumber,
        fromCity: selectedOrigin,
        toCity: selectedDestination,
        fromDetails: originDetail,
        toDetails: destinationDetail,
        vehicleDetails: driverProfile.vehicleName + ' - ' + driverProfile.vehicleModel,
        isAC,
        seatsAvailable: parseInt(seatsAvailable, 10) || 3,
        departureTime: departureTime.trim() || '14:00 to 15:00',
        departureTimestamp: now + 2 * 60 * 60 * 1000,
        farePerSeat: calculatedFare,
        createdAt: now,
      };

      await saveOfferRidePostLocal(newPost);
      
      // Notify passengers looking for this route
      await checkAndNotifyMatchingPost({
        fromCity: selectedOrigin,
        toCity: selectedDestination,
        departureTime: departureTime.trim() || '14:00 to 15:00',
        postedByRole: 'driver',
        posterName: driverProfile.driverName || userProf?.fullName || 'Driver',
      });

      showThemedAlert('Ride Offer Posted!', 'Your ride offer is now live for passengers traveling on this route.', [
        {
          text: 'OK',
          onPress: () => onBack(),
        },
      ], { type: 'success', iconName: 'car-check', autoDismissMs: 4000 });
    } catch (e: any) {
      showThemedAlert('Error', e.message || 'Failed to post ride offer.', undefined, { type: 'error', iconName: 'shield-alert', autoDismissMs: 4000 });
    }
  };

  const handleCopyMessage = () => {
    const msg = `🚗 *Raahi Available!*\n📍 *From:* ${selectedOrigin}\n🏁 *To:* ${selectedDestination}\n💰 *Fare:* Rs. ${calculatedFare.toFixed(2)}\n❄️ *Tier:* ${isAC ? 'AC Premium' : 'Non-AC'}\n⏰ *Time:* ${departureTime}\n👥 *Seats:* ${seatsAvailable}`;
    Clipboard.setString(msg);
    showThemedAlert('Message Copied', 'WhatsApp message text copied to clipboard.', undefined, { type: 'success', iconName: 'check-decagram', autoDismissMs: 4000 });
  };

  const handleShareWhatsApp = async () => {
    const msg = `🚗 *Raahi Available!*\n📍 *From:* ${selectedOrigin}\n🏁 *To:* ${selectedDestination}\n💰 *Fare:* Rs. ${calculatedFare.toFixed(2)}\n❄️ *Tier:* ${isAC ? 'AC Premium' : 'Non-AC'}\n⏰ *Time:* ${departureTime}\n👥 *Seats:* ${seatsAvailable}`;
    try {
      await openWhatsApp(driverProfile.phoneNumber, msg);
    } catch (error: any) {
      showThemedAlert('Share Failed', error.message || 'Unable to open WhatsApp.', undefined, { type: 'error', iconName: 'shield-alert', autoDismissMs: 4000 });
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      {/* Soft UI Elevated App Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color="#262A27" />
        </TouchableOpacity>
        <Text style={[styles.title, getTextStyle()]}>
          {isUrdu ? 'سفر کی پیشکش تخلیق کریں' : 'Create Ride Offer'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Route Selectors Card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, getTextStyle()]}>
            {isUrdu ? 'راستہ اور مقامات' : 'Route & Locations'}
          </Text>

          <View style={styles.routeBox}>
            {/* Origin Picker */}
            <Text style={styles.inputLabel}>{t('fromCity')}</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => openPicker('origin')} activeOpacity={0.85}>
              <Icon name="map-marker" size={18} color="#2F9A3C" style={styles.pickerIcon} />
              <Text style={[styles.pickerSelectorText, !selectedOrigin ? styles.pickerPlaceholder : null]}>
                {selectedOrigin || t('selectDepartureCity')}
              </Text>
              <Icon name="chevron-down" size={18} color="#8A908B" />
            </TouchableOpacity>

            <TextInput
              style={styles.detailInput}
              placeholder="Landmark/Pickup details (e.g. Metro Pole, Gate 3)"
              placeholderTextColor="#8A908B"
              value={originDetail}
              onChangeText={setOriginDetail}
            />

            <View style={styles.routeDivider} />

            {/* Destination Picker */}
            <Text style={styles.inputLabel}>{t('toCity')}</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => openPicker('destination')} activeOpacity={0.85}>
              <Icon name="flag-checkered" size={18} color="#2F9A3C" style={styles.pickerIcon} />
              <Text style={[styles.pickerSelectorText, !selectedDestination ? styles.pickerPlaceholder : null]}>
                {selectedDestination || 'Choose Destination Location...'}
              </Text>
              <Icon name="chevron-down" size={18} color="#8A908B" />
            </TouchableOpacity>

            <TextInput
              style={styles.detailInput}
              placeholder="Dropoff details (e.g. Block 5, next to mall)"
              placeholderTextColor="#8A908B"
              value={destinationDetail}
              onChangeText={setDestinationDetail}
            />
          </View>

          {/* AC Toggle */}
          <View style={styles.switchContainer}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchLabel}>Air Conditioning (AC)</Text>
              <Text style={styles.switchDesc}>Enable AC premium tier pricing</Text>
            </View>
            <View style={styles.switchControl}>
              <View style={styles.tierBadge}>
                <Icon name={isAC ? 'snowflake' : 'fan'} size={14} color="#2F9A3C" />
                <Text style={styles.tierBadgeText}>
                  {isAC ? 'AC' : 'Non-AC'}
                </Text>
              </View>
              <Switch
                value={isAC}
                onValueChange={setIsAC}
                trackColor={{ false: '#E9ECE9', true: '#2F9A3C' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Selected Route Match Warning */}
        {selectedOrigin && selectedDestination && !matchedRouteConfig && (
          <View style={styles.warningBox}>
            <Icon name="alert-circle-outline" size={20} color="#262A27" />
            <Text style={styles.warningText}>
              No configured route found from {selectedOrigin} to {selectedDestination}. Please check your combinations.
            </Text>
          </View>
        )}

        {/* Fare Summary Card */}
        {matchedRouteConfig && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare Summary (Per Seat)</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#8A908B' }}>Tier</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2F9A3C' }}>{isAC ? 'AC Premium' : 'Non-AC Standard'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#8A908B' }}>Fare</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#2F9A3C' }}>Rs. {calculatedFare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>

            {/* Departure Time Input */}
            <View style={styles.inputRowContainer}>
              <Icon name="clock-outline" size={18} color="#8A908B" style={{ marginRight: 8 }} />
              <Text style={styles.inputRowLabel}>Departure Time</Text>
              <TextInput
                style={styles.inputRowField}
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="14:00 to 15:00"
                placeholderTextColor="#8A908B"
              />
            </View>

            {/* Seats Count Input */}
            <View style={styles.inputRowContainer}>
              <Icon name="account-outline" size={18} color="#8A908B" style={{ marginRight: 8 }} />
              <Text style={styles.inputRowLabel}>Available Seats</Text>
              <TextInput
                style={styles.inputRowField}
                keyboardType="numeric"
                value={seatsAvailable}
                onChangeText={setSeatsAvailable}
                placeholder="3 Seats"
                placeholderTextColor="#8A908B"
              />
            </View>

            {/* Primary Post Button */}
            <TouchableOpacity style={styles.primaryPostBtn} onPress={handlePostRideOffer} activeOpacity={0.85}>
              <Icon name="check-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryPostBtnText}>Post Ride Offer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message Preview and Actions */}
        {matchedRouteConfig && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Message Preview</Text>
            
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                🚗 *Raahi Available!*{'\n'}
                📍 *From:* {selectedOrigin}{'\n'}
                🏁 *To:* {selectedDestination}{'\n'}
                💰 *Fare:* Rs. {calculatedFare.toFixed(2)}{'\n'}
                ❄️ *Tier:* {isAC ? 'AC Premium' : 'Non-AC'}{'\n'}
                ⏰ *Time:* {departureTime}{'\n'}
                👥 *Seats:* {seatsAvailable}
              </Text>
            </View>

            <View style={styles.copyButtonsRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleCopyMessage}
                activeOpacity={0.85}
              >
                <Icon name="content-copy" size={16} color="#262A27" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionBtnText}>Copy Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleShareWhatsApp}
                activeOpacity={0.85}
              >
                <Icon name="whatsapp" size={18} color="#2F9A3C" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryActionBtnText}>Share on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Interactive Map Location Picker Modal */}
      <MapLocationPickerModal
        visible={modalVisible}
        title={`Select ${activePicker === 'origin' ? 'Pickup Location' : 'Destination'} on Map`}
        type={activePicker === 'origin' ? 'from' : 'to'}
        initialCityName={activePicker === 'origin' ? selectedOrigin : selectedDestination}
        onSelectLocation={(locName) => {
          if (activePicker === 'origin') {
            setSelectedOrigin(locName);
          } else {
            setSelectedDestination(locName);
          }
        }}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F3F2',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
  },
  loadingText: {
    color: '#8A908B',
    marginTop: 12,
    fontSize: 14,
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
    paddingBottom: 40,
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
    marginBottom: 12,
  },
  routeBox: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 6,
    marginTop: 8,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  pickerIcon: {
    marginRight: 10,
  },
  pickerSelectorText: {
    flex: 1,
    fontSize: 14,
    color: '#262A27',
  },
  pickerPlaceholder: {
    color: '#8A908B',
  },
  detailInput: {
    backgroundColor: '#F2F3F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#262A27',
    marginBottom: 8,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E3E7E3',
    marginVertical: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
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
  switchControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2F9A3C',
    marginLeft: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#8A908B',
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputRowLabel: {
    fontSize: 13,
    color: '#262A27',
    marginRight: 8,
    fontWeight: '600',
  },
  inputRowField: {
    flex: 1,
    fontSize: 14,
    color: '#262A27',
    textAlign: 'right',
    fontWeight: '600',
  },
  primaryPostBtn: {
    backgroundColor: '#2F9A3C',
    borderRadius: 20,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  primaryPostBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: '#F2F3F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  previewText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#262A27',
    lineHeight: 18,
  },
  copyButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondaryActionBtnText: {
    color: '#262A27',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
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
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#8A908B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2F9A3C',
    borderRadius: 20,
    height: 52,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 42, 39, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 52,
  },
  searchBar: {
    flex: 1,
    height: 52,
    color: '#262A27',
    fontSize: 14,
    marginLeft: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F2',
  },
  locationItemText: {
    fontSize: 14,
    color: '#262A27',
    marginLeft: 10,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#8A908B',
    fontSize: 13,
  },
});
