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
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import { TripData } from '../types';
import { openWhatsApp, shareTrip } from '../services/deepLinkService';

interface TripViewerScreenProps {
  trip: TripData;
  onBack: () => void;
}

export default function TripViewerScreen({ trip, onBack }: TripViewerScreenProps) {
  const formattedTime = new Date(trip.timestamp).toLocaleString();

  const handleOpenMaps = async (address: string) => {
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
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      {/* Soft UI Elevated App Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color="#262A27" />
        </TouchableOpacity>
        <Text style={styles.title}>Trip Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Soft UI Elevated Journey Overview Card */}
        <View style={styles.journeyHeroCard}>
          <View style={styles.heroHeader}>
            <Icon name="routes" size={18} color="#2F9A3C" />
            <Text style={styles.heroHeaderText}>Active Carpool Route</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroFromText}>{trip.originAddress.split(' (')[0]}</Text>
            <View style={styles.arrowPill}>
              <Icon name="arrow-right" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.heroToText}>{trip.destinationAddress.split(' (')[0]}</Text>
          </View>
        </View>

        {/* Route Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route Stops & Details</Text>
          
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
                activeOpacity={0.85}
              >
                <View style={styles.stopTextWrapper}>
                  <Text style={styles.stopLabel}>Origin (Tap to open Map)</Text>
                  <Text style={styles.stopValue}>{trip.originAddress}</Text>
                </View>
                <Icon name="map-search-outline" size={18} color="#2F9A3C" />
              </TouchableOpacity>

              <View style={styles.stopGap} />

              <TouchableOpacity
                style={styles.stopClickable}
                onPress={() => handleOpenMaps(trip.destinationAddress)}
                activeOpacity={0.85}
              >
                <View style={styles.stopTextWrapper}>
                  <Text style={styles.stopLabel}>Destination (Tap to open Map)</Text>
                  <Text style={styles.stopValue}>{trip.destinationAddress}</Text>
                </View>
                <Icon name="map-search-outline" size={18} color="#2F9A3C" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fare Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Details</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareAmount}>Rs. {trip.fare.toFixed(2)}</Text>
            <View style={styles.tierBadge}>
              <Icon name={trip.isAC ? 'snowflake' : 'fan'} size={14} color="#2F9A3C" />
              <Text style={styles.tierBadgeText}>
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
              <Icon name="account" size={22} color="#2F9A3C" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverVehicleName}>
                {trip.driverVehicleName} {trip.driverVehicleModel}
              </Text>
              <Text style={styles.driverPhone}>{trip.driverPhone}</Text>
            </View>
          </View>
          <View style={styles.metadataContainer}>
            <Icon name="clock-outline" size={13} color="#8A908B" />
            <Text style={styles.postedTime}>Posted: {formattedTime}</Text>
          </View>
        </View>

        {/* Primary Action Button (Green tactile button) */}
        <TouchableOpacity style={styles.contactButton} onPress={handleContactDriver} activeOpacity={0.85}>
          <Icon name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contact Driver</Text>
        </TouchableOpacity>

        {/* Secondary Action Button (White soft button) */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
          <Icon name="share-variant" size={16} color="#262A27" />
          <Text style={styles.shareButtonText}>Share This Ride</Text>
        </TouchableOpacity>
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
  journeyHeroCard: {
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
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroHeaderText: {
    color: '#2F9A3C',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroFromText: {
    color: '#262A27',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  arrowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2F9A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  heroToText: {
    color: '#262A27',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 12,
  },
  timelineContainer: {
    flexDirection: 'row',
  },
  timelineGraphic: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  originCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F9A3C',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E9ECE9',
    marginVertical: 4,
  },
  destCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#262A27',
  },
  stopsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stopClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 14,
    padding: 12,
  },
  stopTextWrapper: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 11,
    color: '#8A908B',
  },
  stopValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 2,
  },
  stopGap: {
    height: 10,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F9A3C',
    marginLeft: 6,
  },
  fareDescription: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 8,
    lineHeight: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    marginLeft: 12,
  },
  driverVehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
  },
  driverPhone: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 2,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3E7E3',
    paddingTop: 10,
  },
  postedTime: {
    fontSize: 12,
    color: '#8A908B',
    marginLeft: 6,
  },
  contactButton: {
    backgroundColor: '#2F9A3C',
    borderRadius: 20,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E3',
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
  shareButtonText: {
    color: '#262A27',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
