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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getDriverProfile } from '../services/storage';
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Create a Ride</Text>
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
      const now = Date.now();
      const newPost: OfferRidePost = {
        id: 'offer_' + now,
        driverUid: driverProfile.phoneNumber,
        driverName: driverProfile.vehicleName + ' (' + driverProfile.vehicleModel + ')',
        driverPhone: driverProfile.phoneNumber,
        fromCity: selectedOrigin,
        toCity: selectedDestination,
        fromDetails: originDetail,
        toDetails: destinationDetail,
        vehicleDetails: driverProfile.vehicleName + ' - ' + driverProfile.vehicleModel,
        isAC,
        seatsAvailable: parseInt(seatsAvailable, 10) || 3,
        departureTime: '14:00', // Default 2:00 PM departure window
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Create a Ride</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Route Selectors Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route & Locations</Text>

          <View style={styles.routeBox}>
            {/* Origin Picker */}
            <Text style={styles.inputLabel}>Origin Point</Text>
            <TouchableOpacity style={styles.pickerSelector} onPress={() => openPicker('origin')}>
              <Icon name="map-marker" size={20} color="#43A047" style={styles.pickerIcon} />
              <Text style={[styles.pickerSelectorText, !selectedOrigin ? styles.pickerPlaceholder : null]}>
                {selectedOrigin || 'Choose Origin Location...'}
              </Text>
              <Icon name="chevron-down" size={20} color="#6B7280" />
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
            <Text style={styles.cardTitle}>Fare Summary (From Google Sheet)</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tier Option:</Text>
              <Text style={styles.summaryValue}>{isAC ? 'AC Premium' : 'Non-AC Standard'}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Fare per seat:</Text>
              <Text style={styles.totalValue}>Rs. {calculatedFare.toFixed(2)}</Text>
            </View>

            {/* Seats Count Input */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Available Seats</Text>
            <TextInput
              style={styles.detailInput}
              keyboardType="numeric"
              value={seatsAvailable}
              onChangeText={setSeatsAvailable}
              placeholder="e.g. 3"
            />

            {/* Primary Post Button */}
            <TouchableOpacity style={styles.postRideButton} onPress={handlePostRideOffer}>
              <Icon name="check-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.postRideButtonText}>Post Ride Offer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message Preview and Actions */}
        {tripObj !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Message Preview</Text>
            
            <View style={styles.previewBox}>
              <Text style={styles.previewText} numberOfLines={8}>
                {generatedMessage}
              </Text>
            </View>

            <View style={styles.copyButtonsRow}>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyMessage}>
                <Icon name="message-text-outline" size={16} color="#43A047" />
                <Text style={styles.copyButtonText}>Copy Message</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                <Icon name="link-variant" size={16} color="#43A047" />
                <Text style={styles.copyButtonText}>Copy Link</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.whatsappButton} onPress={handleShareWhatsApp}>
              <Icon name="whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>Share on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Location Selector Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
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
  routeBox: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pickerIcon: {
    marginRight: 12,
  },
  pickerSelectorText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  detailInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: 44,
    color: '#111827',
    fontSize: 15,
    marginLeft: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  locationItemText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
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
