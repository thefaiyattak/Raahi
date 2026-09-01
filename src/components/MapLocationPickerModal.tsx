import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from './AppIcon';
import { OSMMapView, OSMMapMarker } from './OSMMapView';
import {
  LatLng,
  searchPlacesOSM,
  reverseGeocodeOSM,
  SearchPlaceResult,
} from '../services/osmService';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export interface MapLocationPickerModalProps {
  visible: boolean;
  title: string;
  type: 'from' | 'to';
  initialCityName?: string;
  onSelectLocation: (locationName: string, coords?: LatLng) => void;
  onClose: () => void;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  visible,
  title,
  type,
  initialCityName = '',
  onSelectLocation,
  onClose,
}) => {
  const { theme } = useTheme();
  const { getTextStyle } = useLanguage();

  const [selectedCoord, setSelectedCoord] = useState<LatLng>({
    latitude: 33.6844,
    longitude: 73.0479,
  });
  const [locationName, setLocationName] = useState<string>(initialCityName || 'Islamabad');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchPlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Popular Pakistani cities quick selector buttons
  const popularCities = [
    { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
    { name: 'Rawalpindi', lat: 33.5984, lng: 73.0441 },
    { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
    { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
    { name: 'Multan', lat: 30.1575, lng: 71.5249 },
    { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
    { name: 'Kohat', lat: 33.5869, lng: 71.4414 },
    { name: 'Karak', lat: 33.1111, lng: 71.0917 },
    { name: 'DI Khan', lat: 31.8314, lng: 70.9019 },
  ];

  useEffect(() => {
    if (visible && initialCityName) {
      setLocationName(initialCityName);
      const match = popularCities.find(
        (c) => c.name.toLowerCase() === initialCityName.toLowerCase()
      );
      if (match) {
        setSelectedCoord({ latitude: match.lat, longitude: match.lng });
      }
    }
  }, [visible, initialCityName]);

  // Handle Nominatim text search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      setIsSearching(true);
      const res = await searchPlacesOSM(text);
      setSearchResults(res);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  // Handle map tap (Pin drop)
  const handleMapPress = async (coord: LatLng) => {
    setSelectedCoord(coord);
    setIsReverseGeocoding(true);
    const resolvedName = await reverseGeocodeOSM(coord.latitude, coord.longitude);
    // Format to a concise readable name (e.g. City or Area)
    const parts = resolvedName.split(', ');
    const concise = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 3] || parts[parts.length - 2]}` : resolvedName;
    setLocationName(concise);
    setIsReverseGeocoding(false);
  };

  const handleSelectSearchResult = (item: SearchPlaceResult) => {
    const coord: LatLng = { latitude: item.latitude, longitude: item.longitude };
    setSelectedCoord(coord);
    setLocationName(item.name || item.displayName.split(',')[0]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleConfirm = () => {
    onSelectLocation(locationName || (type === 'from' ? 'Origin' : 'Destination'), selectedCoord);
    onClose();
  };

  const markers: OSMMapMarker[] = [
    {
      id: 'selected_pin',
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      title: locationName,
      description: `${selectedCoord.latitude.toFixed(4)}, ${selectedCoord.longitude.toFixed(4)}`,
      iconType: type === 'from' ? 'pickup' : 'dropoff',
      pinColor: type === 'from' ? '#2F9A3C' : '#E53935',
    },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.8}>
            <Icon name="arrow-left" size={20} color="#262A27" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text style={[styles.headerTitle, getTextStyle()]} numberOfLines={1}>
              {title || 'Select Location on Map'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Tap anywhere on the map or search
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputRow}>
            <Icon name="search" size={18} color="#8A908B" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, getTextStyle()]}
              placeholder="Search area, landmark or city in Pakistan..."
              placeholderTextColor="#8A908B"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Icon name="close" size={16} color="#8A908B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick City Pills */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={popularCities}
            keyExtractor={(item) => item.name}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.cityPill,
                  locationName.toLowerCase().includes(item.name.toLowerCase()) && styles.activeCityPill,
                ]}
                onPress={() => {
                  setSelectedCoord({ latitude: item.lat, longitude: item.lng });
                  setLocationName(item.name);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.cityPillText,
                    locationName.toLowerCase().includes(item.name.toLowerCase()) && styles.activeCityPillText,
                    getTextStyle(),
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Autocomplete Results Overlay */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsBox}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.placeId)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <Icon name="map-marker" size={18} color="#2F9A3C" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={2}>
                      {item.displayName}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Interactive OpenStreetMap Map */}
        <View style={styles.mapContainer}>
          <OSMMapView
            initialCenter={selectedCoord}
            initialZoom={13}
            markers={markers}
            onMapPress={handleMapPress}
            style={{ flex: 1 }}
            interactive={true}
          />

          {/* Map Instruction Pill */}
          <View style={styles.mapBanner}>
            <Icon name="navigation" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.mapBannerText}>
              {isReverseGeocoding ? 'Detecting address...' : 'Tap map to drop pin'}
            </Text>
          </View>
        </View>

        {/* Bottom Floating Selection Card */}
        <View style={styles.bottomCard}>
          <View style={styles.selectedAddressRow}>
            <View style={[styles.pinIndicator, { backgroundColor: type === 'from' ? '#2F9A3C' : '#E53935' }]}>
              <Icon name={type === 'from' ? 'map-marker' : 'flag-checkered'} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedLabel}>
                {type === 'from' ? 'PICKUP LOCATION' : 'DROP-OFF DESTINATION'}
              </Text>
              {isReverseGeocoding ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <ActivityIndicator size="small" color="#2F9A3C" />
                  <Text style={{ fontSize: 13, color: '#8A908B', marginLeft: 6 }}>Finding place...</Text>
                </View>
              ) : (
                <Text style={[styles.selectedName, getTextStyle()]} numberOfLines={2}>
                  {locationName}
                </Text>
              )}
              <Text style={styles.coordsText}>
                {selectedCoord.latitude.toFixed(4)}, {selectedCoord.longitude.toFixed(4)}
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: type === 'from' ? '#2F9A3C' : '#2F9A3C' }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Icon name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[styles.confirmBtnText, getTextStyle()]}>Confirm {type === 'from' ? 'Pickup' : 'Destination'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F3F2',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F2F3F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262A27',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#262A27',
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#F2F3F2',
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  activeCityPill: {
    backgroundColor: '#2F9A3C',
    borderColor: '#2F9A3C',
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262A27',
  },
  activeCityPillText: {
    color: '#FFFFFF',
  },
  searchResultsBox: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    maxHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    zIndex: 999,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F2',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
  },
  resultAddress: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 42, 39, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  mapBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 28 : 36,
    borderTopWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  selectedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinIndicator: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A908B',
    letterSpacing: 0.5,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#262A27',
    marginTop: 2,
  },
  coordsText: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  confirmBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default MapLocationPickerModal;
