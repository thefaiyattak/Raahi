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
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getDriverProfile, getUserProfile } from '../services/storage';
import { fetchRoutes, getUniqueLocations, matchRoute } from '../services/sheetService';
import { encodeTripToDeepLink, generateWhatsAppMessage, openWhatsApp } from '../services/deepLinkService';
import { saveOfferRidePostLocal } from '../services/dbService';
import { DriverProfile, TripData, RouteConfig, OfferRidePost } from '../types';

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

  const resetForm = () => {
    setSelectedOrigin('');
    setOriginDetail('');
    setSelectedDestination('');
    setDestinationDetail('');
    setMatchedRouteConfig(null);
    setIsAC(driverProfile?.defaultACStatus || false);
  };

  if (isLoadingProfile || loadingRoutes) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#43A047" />
        <Text style={styles.loadingText}>Fetching configured routes...</Text>
      </View>
    );
  }

  if (!driverProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: 18, fontWeight: '800' }, getTextStyle()]}>
          {isUrdu ? 'سفر کی پیشکش تخلیق کریں' : 'Create Ride Offer'}
        </Text>
        <TouchableOpacity style={{ padding: 4 }}>
          <Icon name="help-circle" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>
        <View style={styles.emptyContainer}>
          <Icon name="car-off" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Vehicle Profile</Text>
          <Text style={styles.emptyText}>
            You must configure your vehicle make, model, and WhatsApp number before you can offer rides.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onNavigateToProfile}>
            <Text style={styles.emptyButtonText}>Setup Vehicle Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const finalOriginText = selectedOrigin + (originDetail.trim() ? ` (${originDetail.trim()})` : '');
  const finalDestinationText = selectedDestination + (destinationDetail.trim() ? ` (${destinationDetail.trim()})` : '');

  // Calculate fare details
  const distanceKm = matchedRouteConfig ? matchedRouteConfig.distanceKm : 0;
  const calculatedFare = matchedRouteConfig ? (isAC ? matchedRouteConfig.acFare : matchedRouteConfig.nonAcFare) : 0;

  // Generate trip object
  const getTripObject = (): TripData | null => {
    if (!selectedOrigin || !selectedDestination || !matchedRouteConfig) return null;
    return {
      originAddress: finalOriginText,
      originPlaceId: 'sheet-loc-' + selectedOrigin.toLowerCase(),
      originLat: 0, // No coordinates needed in sheets-only route version
      originLng: 0,
      destinationAddress: finalDestinationText,
      destinationPlaceId: 'sheet-loc-' + selectedDestination.toLowerCase(),
      destinationLat: 0,
      destinationLng: 0,
      distanceKm,
      fare: calculatedFare,
      isAC,
      driverPhone: driverProfile.phoneNumber,
      driverVehicleName: driverProfile.vehicleName,
      driverVehicleModel: driverProfile.vehicleModel,
      timestamp: Date.now(),
    };
  };

  const tripObj = getTripObject();
  const generatedDeepLink = tripObj ? encodeTripToDeepLink(tripObj) : '';
  const generatedMessage = tripObj ? generateWhatsAppMessage(tripObj, generatedDeepLink) : '';

  const handleCopyLink = () => {
    if (!generatedDeepLink) return;
    Clipboard.setString(generatedDeepLink);
    Alert.alert('Link Copied', 'The carpool ride deep link has been copied to your clipboard.');
  };

  const handleCopyMessage = () => {
    if (!generatedMessage) return;
    Clipboard.setString(generatedMessage);
    Alert.alert('Message Copied', 'WhatsApp message text copied to clipboard.');
  };

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
      Alert.alert('Ride Offer Posted!', 'Your ride offer is now live. Other users can view and request seats.', [
        {
          text: 'OK',
          onPress: () => onBack(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post ride offer.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!tripObj || !generatedMessage) return;
    try {
      await openWhatsApp(driverProfile.phoneNumber, generatedMessage);
    } catch (error: any) {
      Alert.alert('Share Failed', error.message || 'Unable to open WhatsApp.');
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary, fontSize: 18, fontWeight: '800' }, getTextStyle()]}>
          {isUrdu ? 'سفر کی پیشکش تخلیق کریں' : 'Create Ride Offer'}
        </Text>
        <TouchableOpacity style={{ padding: 4 }}>
          <Icon name="help-circle" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Route Selectors Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.primary }, getTextStyle()]}>{isUrdu ? 'راستہ اور مقامات' : 'Route & Locations'}</Text>

          <View style={styles.routeBox}>
            {/* Origin Picker */}
            <Text style={[styles.inputLabel, { color: theme.textPrimary }, getTextStyle()]}>{t('fromCity')}</Text>
            <TouchableOpacity style={[styles.pickerSelector, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => openPicker('origin')}>
              <Icon name="map-marker" size={20} color={theme.primary} style={styles.pickerIcon} />
              <Text style={[styles.pickerSelectorText, !selectedOrigin ? { color: theme.textMuted } : { color: theme.textPrimary }, getTextStyle()]}>
                {selectedOrigin || t('selectDepartureCity')}
              </Text>
              <Icon name="chevron-down" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.detailInput}
              placeholder="Landmark/Pickup details (e.g. Metro Pole, Gate 3)"
              placeholderTextColor="#9CA3AF"
              value={originDetail}
              onChangeText={setOriginDetail}
            />

            <View style={styles.routeDivider} />

            {/* Destination Picker */}
            <Text style={styles.inputLabel}>Destination Point</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => openPicker('destination')}>
              <Icon name="flag-checkered" size={20} color="#E65100" style={styles.pickerIcon} />
              <Text style={[styles.pickerSelectorText, !selectedDestination ? styles.pickerPlaceholder : null]}>
                {selectedDestination || 'Choose Destination Location...'}
              </Text>
              <Icon name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TextInput
              style={styles.detailInput}
              placeholder="Dropoff details (e.g. Block 5, next to mall)"
              placeholderTextColor="#9CA3AF"
              value={destinationDetail}
              onChangeText={setDestinationDetail}
            />
          </View>

          {/* AC Toggle */}
          <View style={styles.switchContainer}>
            <View>
              <Text style={styles.switchLabel}>Air Conditioning (AC)</Text>
              <Text style={styles.switchDesc}>Enable AC premium tier pricing</Text>
            </View>
            <View style={styles.switchControl}>
              <View style={[styles.tierBadge, isAC ? styles.badgeAC : styles.badgeNonAC]}>
                <Icon name={isAC ? 'snowflake' : 'fan'} size={12} color={isAC ? '#43A047' : '#E65100'} />
                <Text style={[styles.tierBadgeText, isAC ? styles.badgeTextAC : styles.badgeTextNonAC]}>
                  {isAC ? 'AC' : 'Non-AC'}
                </Text>
              </View>
              <Switch
                value={isAC}
                onValueChange={setIsAC}
                trackColor={{ false: '#E5E7EB', true: '#A5D6A7' }}
                thumbColor={isAC ? '#43A047' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* Selected Route Match Verification */}
        {selectedOrigin && selectedDestination && !matchedRouteConfig && (
          <View style={styles.warningBox}>
            <Icon name="alert-circle-outline" size={22} color="#EF4444" />
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
              <Text style={{ fontSize: 13, color: '#6B7280' }}>Tier</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#2E7D32' }}>{isAC ? 'AC Premium' : 'Non-AC Standard'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>Fare</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#2E7D32' }}>Rs. {calculatedFare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>

            {/* Departure Time Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 42, marginBottom: 12 }}>
              <Icon name="clock-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#374151', marginRight: 8, fontWeight: '600' }}>Departure Time</Text>
              <TextInput
                style={{ flex: 1, fontSize: 13, color: '#111827', textAlign: 'right', fontWeight: '700' }}
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="14:00 to 15:00"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Seats Count Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 42, marginBottom: 16 }}>
              <Icon name="account-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#374151', marginRight: 8, fontWeight: '600' }}>Available Seats</Text>
              <TextInput
                style={{ flex: 1, fontSize: 13, color: '#111827', textAlign: 'right', fontWeight: '700' }}
                keyboardType="numeric"
                value={seatsAvailable}
                onChangeText={setSeatsAvailable}
                placeholder="3 Seats"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Primary Post Button */}
            <TouchableOpacity style={{ backgroundColor: '#2E7D32', borderRadius: 12, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={handlePostRideOffer}>
              <Icon name="check-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Post Ride Offer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message Preview and Actions */}
        {tripObj !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Message Preview</Text>
            
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 }}>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                🚗 *Raahi Available!*{'\n'}
                📍 *From:* {selectedOrigin}{'\n'}
                🏁 *To:* {selectedDestination}{'\n'}
                💰 *Fare:* Rs. {calculatedFare.toFixed(2)}{'\n'}
                ❄️ *Tier:* {isAC ? 'AC Premium' : 'Non-AC'}{'\n'}
                ⏰ *Time:* {departureTime}{'\n'}
                👥 *Seats:* {seatsAvailable}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ flex: 1, height: 42, borderWidth: 1, borderColor: '#2E7D32', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}
                onPress={handleCopyMessage}
              >
                <Icon name="content-copy" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
                <Text style={{ color: '#2E7D32', fontSize: 13, fontWeight: '700' }}>Copy Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, height: 42, borderWidth: 1, borderColor: '#25D366', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}
                onPress={handleShareWhatsApp}
              >
                <Icon name="whatsapp" size={18} color="#25D366" style={{ marginRight: 6 }} />
                <Text style={{ color: '#25D366', fontSize: 13, fontWeight: '700' }}>Share on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Location Selector Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Select {activePicker === 'origin' ? 'Origin' : 'Destination'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBarContainer}>
                <Icon name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchBar}
                  placeholder="Search location..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.locationItem} onPress={() => handleSelectLocation(item)}>
                    <Icon name="map-marker-outline" size={20} color="#6B7280" />
                    <Text style={styles.locationItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>No locations match your search.</Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
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
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  routeBox: {
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    height: 42,
  },
  pickerIcon: {
    marginRight: 10,
  },
  pickerSelectorText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  detailInput: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    marginBottom: 12,
    height: 40,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  switchControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  badgeAC: {
    backgroundColor: '#E8F5E9',
  },
  badgeNonAC: {
    backgroundColor: '#FFF3E0',
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  badgeTextAC: {
    color: '#2E7D32',
  },
  badgeTextNonAC: {
    color: '#E65100',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#43A047',
  },
  previewBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  previewText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  copyButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  copyButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#43A047',
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyButtonText: {
    color: '#43A047',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  whatsappButton: {
    backgroundColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#EF5350',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  resetButtonText: {
    color: '#EF5350',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#43A047',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 40,
  },
  searchBar: {
    flex: 1,
    height: 40,
    color: '#111827',
    fontSize: 13,
    marginLeft: 6,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  locationItemText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 10,
  },
  emptyList: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  postRideButton: {
    backgroundColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  postRideButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
