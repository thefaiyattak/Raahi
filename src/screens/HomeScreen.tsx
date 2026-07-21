import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  FlatList,
  Linking,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { UserProfile, OfferRidePost, BookRidePost } from '../types';
import {
  getOfferRidePostsLocal,
  getBookRidePostsLocal,
  saveBookRidePostLocal,
  saveBookingRequestLocal,
} from '../services/dbService';
import { fetchRoutes, getUniqueLocations } from '../services/sheetService';

interface HomeScreenProps {
  userProfile: UserProfile;
  onNavigateToCreateRide: () => void;
  onNavigateToVehicleConfig: () => void;
  onSignOut: () => void;
}

export default function HomeScreen({
  userProfile,
  onNavigateToCreateRide,
  onNavigateToVehicleConfig,
  _onSignOut,
}: HomeScreenProps) {
  // Navigation & Mode Tabs
  const [activeTab, setActiveTab] = useState<'offer' | 'book'>('offer');

  // Dynamic Cities from Google Sheet
  const [sheetCities, setSheetCities] = useState<string[]>([]);

  // Destination Filters (Mandatory per specification)
  const [filterFromCity, setFilterFromCity] = useState('');
  const [filterToCity, setFilterToCity] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Data lists
  const [offerPosts, setOfferPosts] = useState<OfferRidePost[]>([]);
  const [bookPosts, setBookPosts] = useState<BookRidePost[]>([]);

  // Modals & Forms
  const [showBookFormModal, setShowBookFormModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Book Ride Form State
  const [bookFrom, setBookFrom] = useState('');
  const [bookTo, setBookTo] = useState('');
  const [bagsCount, setBagsCount] = useState('1');
  const [passengersCount, setPassengersCount] = useState('1');
  const [isAC, setIsAC] = useState(true);
  const [departureTime, setDepartureTime] = useState('14:00');

  const fetchPosts = useCallback(async () => {
    try {
      if (activeTab === 'offer') {
        const data = await getOfferRidePostsLocal(filterFromCity, filterToCity);
        setOfferPosts(data);
      } else {
        const data = await getBookRidePostsLocal(filterFromCity, filterToCity);
        setBookPosts(data);
      }
    } catch (e) {
      console.warn('Failed to load posts', e);
    }
  }, [activeTab, filterFromCity, filterToCity]);

  useEffect(() => {
    loadCitiesFromSheet();
  }, []);

  const loadCitiesFromSheet = async () => {
    try {
      const routes = await fetchRoutes();
      const cities = getUniqueLocations(routes);
      setSheetCities(cities);
    } catch (e) {
      console.warn('Failed to load cities from sheet', e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePassengerRequest = async () => {
    if (!bookFrom || !bookTo) {
      Alert.alert('Validation Error', 'Please select From and To cities.');
      return;
    }

    try {
      const now = Date.now();
      const newPost: BookRidePost = {
        id: 'book_' + now,
        passengerUid: userProfile.uid,
        passengerName: userProfile.fullName,
        passengerPhone: userProfile.phoneNumber,
        fromCity: bookFrom,
        toCity: bookTo,
        fromDetails: bookFromDetails,
        toDetails: bookToDetails,
        bagsCount: parseInt(bagsCount, 10) || 0,
        passengersCount: parseInt(passengersCount, 10) || 1,
        isAC,
        departureTime,
        departureTimestamp: now + 2 * 60 * 60 * 1000, // Default 2 hours ahead
        createdAt: now,
      };

      await saveBookRidePostLocal(newPost);
      setShowBookFormModal(false);
      Alert.alert('Success', 'Your ride request has been posted!');
      fetchPosts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create request.');
    }
  };

  const handleOpenWhatsApp = (phone: string, text?: string) => {
    let cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(
      text || 'Hi! I saw your post on Raahi.'
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'WhatsApp is not installed on this device.');
    });
  };

  const handleSendBookingRequest = async (post: OfferRidePost) => {
    try {
      const newRequest = {
        id: 'req_' + Date.now(),
        ridePostId: post.id,
        passengerUid: userProfile.uid,
        passengerName: userProfile.fullName,
        passengerPhone: userProfile.phoneNumber,
        seatsRequested: 1,
        status: 'pending' as const,
        createdAt: Date.now(),
      };
      await saveBookingRequestLocal(newRequest);
      Alert.alert(
        'Seat Request Sent',
        `A seat request has been sent to ${post.driverName}. You will receive confirmation once accepted.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send seat request.');
    }
  };

  const handleTriggerEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleTriggerEmergencySMS = (number: string) => {
    Linking.openURL(`sms:${number}?body=${encodeURIComponent('EMERGENCY: I need urgent assistance.')}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarCircle}>
            <Icon name="account" size={24} color="#43A047" />
          </View>
          <View>
            <Text style={styles.userName}>{userProfile.fullName}</Text>
            <Text style={styles.userPhone}>{userProfile.phoneNumber} • {userProfile.bloodGroup}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.emergencyIconButton}
            onPress={() => setShowEmergencyModal(true)}
          >
            <Icon name="shield-alert" size={24} color="#D32F2F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileIconButton} onPress={onNavigateToVehicleConfig}>
            <Icon name="car-cog" size={24} color="#E65100" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Role / Action Selection Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offer' ? styles.tabActiveOffer : null]}
          onPress={() => setActiveTab('offer')}
        >
          <Icon name="car-side" size={20} color={activeTab === 'offer' ? '#FFFFFF' : '#4B5563'} />
          <Text style={[styles.tabText, activeTab === 'offer' ? styles.tabTextActive : null]}>
            Offer Ride (Driver)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'book' ? styles.tabActiveBook : null]}
          onPress={() => setActiveTab('book')}
        >
          <Icon name="seat-passenger" size={20} color={activeTab === 'book' ? '#FFFFFF' : '#4B5563'} />
          <Text style={[styles.tabText, activeTab === 'book' ? styles.tabTextActive : null]}>
            Book Ride (Passenger)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mandatory Destination Filter Bar */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>
          <Icon name="filter-variant" size={16} color="#43A047" /> Destination Filter (Required)
        </Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterInput} onPress={() => setShowFromPicker(true)}>
            <Text style={filterFromCity ? styles.filterValueText : styles.filterPlaceholder}>
              {filterFromCity || 'From City'}
            </Text>
            <Icon name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <Icon name="arrow-right" size={20} color="#9CA3AF" style={styles.arrowIcon} />

          <TouchableOpacity style={styles.filterInput} onPress={() => setShowToPicker(true)}>
            <Text style={filterToCity ? styles.filterValueText : styles.filterPlaceholder}>
              {filterToCity || 'To City'}
            </Text>
            <Icon name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        {(filterFromCity || filterToCity) && (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => {
              setFilterFromCity('');
              setFilterToCity('');
            }}
          >
            <Text style={styles.clearFilterText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Primary Action Button */}
      <View style={styles.actionBannerContainer}>
        {activeTab === 'offer' ? (
          <TouchableOpacity style={styles.offerRideBtn} onPress={onNavigateToCreateRide}>
            <Icon name="plus-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Post a Ride Offer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.bookRideBtn} onPress={() => setShowBookFormModal(true)}>
            <Icon name="plus-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Post a Seat Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Posts List / Feed */}
      <ScrollView contentContainerStyle={styles.feedContainer}>
        {activeTab === 'offer' ? (
          <>
            <Text style={styles.sectionHeader}>Available Rides Offered</Text>
            {offerPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="car-off" size={40} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Ride Offers Found</Text>
                <Text style={styles.emptySubtitle}>
                  {filterFromCity || filterToCity
                    ? 'No rides match your destination filter.'
                    : 'Be the first to post a ride offer!'}
                </Text>
              </View>
            ) : (
              offerPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText}>
                        {post.fromCity} ➔ {post.toCity}
                      </Text>
                    </View>
                    <View style={[styles.acBadge, { backgroundColor: post.isAC ? '#E8F5E9' : '#FFF3E0' }]}>
                      <Text style={{ color: post.isAC ? '#43A047' : '#E65100', fontWeight: '700', fontSize: 11 }}>
                        {post.isAC ? 'AC' : 'Non-AC'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.driverName}>Driver: {post.driverName}</Text>
                  <Text style={styles.vehicleText}>Vehicle: {post.vehicleDetails}</Text>
                  <Text style={styles.detailText}>Departure: {post.departureTime}</Text>

                  <View style={styles.fareRow}>
                    <Text style={styles.seatsText}>Seats Available: {post.seatsAvailable}</Text>
                    <Text style={styles.fareText}>Rs. {post.farePerSeat}/seat</Text>
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleOpenWhatsApp(post.driverPhone, `Hi ${post.driverName}, I want to discuss your ride from ${post.fromCity} to ${post.toCity}.`)}
                    >
                      <Icon name="whatsapp" size={18} color="#FFFFFF" />
                      <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.requestSeatBtn}
                      onPress={() => handleSendBookingRequest(post)}
                    >
                      <Text style={styles.requestSeatText}>Send Seat Request</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Passenger Seat Requests</Text>
            {bookPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="account-search" size={40} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Passenger Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  {filterFromCity || filterToCity
                    ? 'No requests match your destination filter.'
                    : 'Be the first to post a passenger seat request!'}
                </Text>
              </View>
            ) : (
              bookPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.routeBadgeBook}>
                      <Text style={styles.routeBadgeText}>
                        {post.fromCity} ➔ {post.toCity}
                      </Text>
                    </View>
                    <View style={[styles.acBadge, { backgroundColor: post.isAC ? '#E8F5E9' : '#FFF3E0' }]}>
                      <Text style={{ color: post.isAC ? '#43A047' : '#E65100', fontWeight: '700', fontSize: 11 }}>
                        {post.isAC ? 'AC' : 'Non-AC'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.driverName}>Passenger: {post.passengerName}</Text>
                  <Text style={styles.detailText}>Passengers: {post.passengersCount} • Bags: {post.bagsCount}</Text>
                  <Text style={styles.detailText}>Departure: {post.departureTime}</Text>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleOpenWhatsApp(post.passengerPhone, `Hi ${post.passengerName}, I am driving from ${post.fromCity} to ${post.toCity} and can pick you up.`)}
                    >
                      <Icon name="whatsapp" size={18} color="#FFFFFF" />
                      <Text style={styles.whatsappBtnText}>Offer Seat via WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Book Ride Form Modal */}
      <Modal visible={showBookFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Post Passenger Seat Request</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>From City *</Text>
              <TextInput style={styles.input} placeholder="e.g. Lahore" value={bookFrom} onChangeText={setBookFrom} />

              <Text style={styles.label}>To City *</Text>
              <TextInput style={styles.input} placeholder="e.g. Islamabad" value={bookTo} onChangeText={setBookTo} />

              <Text style={styles.label}>Number of Passengers *</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={passengersCount} onChangeText={setPassengersCount} />

              <Text style={styles.label}>Number of Bags</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={bagsCount} onChangeText={setBagsCount} />

              <Text style={styles.label}>Departure Time</Text>
              <TextInput style={styles.input} placeholder="e.g. 14:30" value={departureTime} onChangeText={setDepartureTime} />

              <TouchableOpacity style={styles.toggleACBtn} onPress={() => setIsAC(!isAC)}>
                <Icon name={isAC ? 'snowflake' : 'fan'} size={20} color={isAC ? '#43A047' : '#E65100'} />
                <Text style={{ marginLeft: 8, fontWeight: '700' }}>
                  Preference: {isAC ? 'Air Conditioned (AC)' : 'Non-AC'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBookFormModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePassengerRequest}>
                <Text style={styles.confirmBtnText}>Post Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Contacts Modal */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="shield-alert" size={32} color="#D32F2F" />
              <Text style={[styles.modalTitle, { marginLeft: 10, marginBottom: 0 }]}>Emergency Assistance</Text>
            </View>

            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              In case of emergency, contact the default helpline (15) or your trusted contacts immediately.
            </Text>

            {/* Default Emergency Contact: 15 */}
            <View style={styles.emergencyCardDefault}>
              <View>
                <Text style={styles.emergencyNameText}>National Police Helpline</Text>
                <Text style={styles.emergencyNumberText}>15</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.callIconBtn, { marginRight: 8 }]}
                  onPress={() => handleTriggerEmergencySMS('15')}
                >
                  <Icon name="message-text" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callIconBtn}
                  onPress={() => handleTriggerEmergencyCall('15')}
                >
                  <Icon name="phone" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEmergencyModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* From City Picker Modal */}
      <Modal visible={showFromPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select From City</Text>
            <FlatList
              data={sheetCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFilterFromCity(item);
                    setShowFromPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* To City Picker Modal */}
      <Modal visible={showToPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select To City</Text>
            <FlatList
              data={sheetCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFilterToCity(item);
                    setShowToPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  userPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIconButton: {
    padding: 8,
    marginRight: 6,
  },
  profileIconButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    marginRight: 6,
  },
  tabActiveOffer: {
    backgroundColor: '#43A047',
  },
  tabActiveBook: {
    backgroundColor: '#E65100',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  filterPlaceholder: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  clearFilterBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: '700',
  },
  actionBannerContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  offerRideBtn: {
    backgroundColor: '#43A047',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookRideBtn: {
    backgroundColor: '#E65100',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeBadgeBook: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  acBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  vehicleText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  seatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  fareText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#43A047',
  },
  cardActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 6,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  requestSeatBtn: {
    backgroundColor: '#43A047',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  requestSeatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  toggleACBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#E65100',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emergencyCardDefault: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B71C1C',
  },
  emergencyNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D32F2F',
  },
  callIconBtn: {
    backgroundColor: '#D32F2F',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 30,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: 350,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#374151',
  },
});
