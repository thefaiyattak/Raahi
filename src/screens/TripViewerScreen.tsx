import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TripData } from '../types';
import { openWhatsApp, shareTrip } from '../services/deepLinkService';
import { formatFare } from '../services/fareEngine';

interface TripViewerScreenProps {
  trip: TripData;
  onBack: () => void;
}

export default function TripViewerScreen({ trip, onBack }: TripViewerScreenProps) {
  const formattedTime = new Date(trip.timestamp).toLocaleString();

  const handleOpenMaps = async (address: string) => {
    // Generate map search query
    const scheme = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    });

    const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    try {
      const url = scheme || webUrl;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open maps.');
    }
  };

  const handleContactDriver = async () => {
    const bookingMessage = `Hi! I saw your carpool from ${trip.originAddress} to ${trip.destinationAddress}. Is this seat still available?`;
    try {
      await openWhatsApp(trip.driverPhone, bookingMessage);
    } catch (error: any) {
      Alert.alert('WhatsApp Error', error.message || 'Could not launch WhatsApp.');
    }
  };

  const handleShare = async () => {
    try {
      await shareTrip(trip);
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Unable to open share sheet.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Trip Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Replaced Map with a Beautiful Journey Overview Hero Card */}
        <View style={styles.journeyHeroCard}>
          <View style={styles.heroHeader}>
            <Icon name="transit-connection-variant" size={24} color="#FFFFFF" />
            <Text style={styles.heroHeaderText}>Active Carpool Route</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroFromText}>{trip.originAddress.split(' (')[0]}</Text>
            <Icon name="arrow-right-thick" size={24} color="#FFFFFF" style={styles.heroArrow} />
            <Text style={styles.heroToText}>{trip.destinationAddress.split(' (')[0]}</Text>
          </View>
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>Distance: {trip.distanceKm.toFixed(1)} km</Text>
          </View>
        </View>

        {/* Route Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route stops & details</Text>
          
          <View style={styles.timelineContainer}>
            {/* Vertical Line Graphic */}
            <View style={styles.timelineGraphic}>
              <View style={styles.originCircle} />
              <View style={styles.timelineLine} />
              <View style={styles.destCircle} />
            </View>

            {/* Stops details */}
            <View style={styles.stopsContainer}>
              <TouchableOpacity
                style={styles.stopClickable}
                onPress={() => handleOpenMaps(trip.originAddress)}
              >
                <View style={styles.stopTextWrapper}>
                  <Text style={styles.stopLabel}>Origin (Tap to open Map)</Text>
                  <Text style={styles.stopValue}>{trip.originAddress}</Text>
                </View>
                <Icon name="map-search-outline" size={20} color="#43A047" />
              </TouchableOpacity>

              <View style={styles.stopGap} />

              <TouchableOpacity
                style={styles.stopClickable}
                onPress={() => handleOpenMaps(trip.destinationAddress)}
              >
                <View style={styles.stopTextWrapper}>
                  <Text style={styles.stopLabel}>Destination (Tap to open Map)</Text>
                  <Text style={styles.stopValue}>{trip.destinationAddress}</Text>
                </View>
                <Icon name="map-search-outline" size={20} color="#E65100" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fare Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Details</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareAmount}>Rs. {trip.fare.toFixed(2)}</Text>
            <View style={[styles.tierBadge, trip.isAC ? styles.badgeAC : styles.badgeNonAC]}>
              <Icon name={trip.isAC ? 'snowflake' : 'fan'} size={14} color={trip.isAC ? '#43A047' : '#E65100'} />
              <Text style={[styles.tierBadgeText, trip.isAC ? styles.badgeTextAC : styles.badgeTextNonAC]}>
                {trip.isAC ? 'AC Premium' : 'Non-AC Standard'}
              </Text>
            </View>
          </View>
          <Text style={styles.fareDescription}>
            Fares are preconfigured by administrator in Google Sheets.
          </Text>
        </View>

        {/* Driver Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver & Vehicle Info</Text>
          <View style={styles.driverInfoRow}>
            <View style={styles.avatar}>
              <Icon name="account" size={32} color="#43A047" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverVehicleName}>
                {trip.driverVehicleName} {trip.driverVehicleModel}
              </Text>
              <Text style={styles.driverPhone}>{trip.driverPhone}</Text>
            </View>
          </View>
          <View style={styles.metadataContainer}>
            <Icon name="clock-outline" size={14} color="#9CA3AF" />
            <Text style={styles.postedTime}>Posted: {formattedTime}</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.contactButton} onPress={handleContactDriver}>
          <Icon name="whatsapp" size={22} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contact Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Icon name="share-variant" size={20} color="#43A047" />
          <Text style={styles.shareButtonText}>Share This Ride</Text>
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
  journeyHeroCard: {
    backgroundColor: '#43A047',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroHeaderIcon: {
    marginRight: 8,
  },
  heroHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  heroFromText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  heroArrow: {
    marginHorizontal: 16,
  },
  heroToText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'left',
  },
  heroFooter: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroFooterText: {
    color: '#E8F5E9',
    fontSize: 14,
    fontWeight: '600',
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
  timelineContainer: {
    flexDirection: 'row',
  },
  timelineGraphic: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  originCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#43A047',
    borderWidth: 2,
    borderColor: '#A5D6A7',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  destCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E65100',
    borderWidth: 2,
    borderColor: '#FFCC80',
  },
  stopsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stopClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  stopTextWrapper: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stopValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  stopGap: {
    height: 24,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#43A047',
  },
  tierBadge: {
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
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  badgeTextAC: {
    color: '#2E7D32',
  },
  badgeTextNonAC: {
    color: '#E65100',
  },
  fareDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 18,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    marginLeft: 16,
  },
  driverVehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  driverPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  postedTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  contactButton: {
    backgroundColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#43A047',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#43A047',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
