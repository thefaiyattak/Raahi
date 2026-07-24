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
  TouchableWithoutFeedback,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import Icon from '../components/AppIcon';
import RatingsModal from '../components/RatingsModal';
import NeumorphicButton from '../components/NeumorphicButton';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { UserProfile, OfferRidePost, BookRidePost } from '../types';
import {
  getOfferRidePostsLocal,
  getBookRidePostsLocal,
  saveBookRidePostLocal,
  saveBookingRequestLocal,
  getMyOfferRidePostsLocal,
  getMyBookRidePostsLocal,
  updateOfferRidePostLocal,
  deleteOfferRidePostLocal,
  updateBookRidePostLocal,
  deleteBookRidePostLocal,
} from '../services/dbService';
import { fetchRoutes, getUniqueLocations } from '../services/sheetService';
import { getNotificationsLocal } from '../services/notificationService';
import { calculateTrustScore } from '../services/trustScoreService';

interface HomeScreenProps {
  userProfile: UserProfile;
  onNavigateToCreateRide: (fromCity?: string, toCity?: string) => void;
  onNavigateToVehicleConfig: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onNavigateToNotifications: () => void;
  onSignOut: () => void;
}

export default function HomeScreen({
  userProfile,
  onNavigateToCreateRide,
  onNavigateToVehicleConfig,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToNotifications,
  onSignOut,
}: HomeScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { t, isUrdu, getTextStyle } = useLanguage();

  // Top Navigation Tabs: 'dashboard' (Left) | 'home' (Middle) | 'booking' (Right)
  const [mainNavTab, setMainNavTab] = useState<'dashboard' | 'home' | 'booking'>('dashboard');
  // Sub Role Tab: 'passenger' | 'driver'
  const [subRoleTab, setSubRoleTab] = useState<'passenger' | 'driver'>('passenger');

  // Dynamic Cities from Google Sheet
  const [sheetCities, setSheetCities] = useState<string[]>([]);

  // Driver Registration check helper
  const hasVehicleProfile = !!(userProfile?.driverProfile?.isVerified || userProfile?.vehicleDetails || userProfile?.verification?.drivingLicenseNumber);

  // Destination Filters for Booking Screen
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
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);

  // Earnings Date Filter States
  const [earningsFilterMode, setEarningsFilterMode] = useState<'monthly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState('July 2026');
  const [customStartDate, setCustomStartDate] = useState('01/07/2026');
  const [customEndDate, setCustomEndDate] = useState('31/07/2026');

  // New States per Instructions
  const [isPassengerSeatBooked, setIsPassengerSeatBooked] = useState(false);
  const [newRouteFrom, setNewRouteFrom] = useState('');
  const [newRouteTo, setNewRouteTo] = useState('');
  const [showNewRouteFromPicker, setShowNewRouteFromPicker] = useState(false);
  const [showNewRouteToPicker, setShowNewRouteToPicker] = useState(false);
  const [passengerQuickRoutesList, setPassengerQuickRoutesList] = useState([
    { id: '1', from: 'Lahore', to: 'Islamabad' },
    { id: '2', from: 'Rawalpindi', to: 'Faisalabad' },
  ]);

  const [driverQuickRoutesList, setDriverQuickRoutesList] = useState([
    { id: '3', from: 'Islamabad', to: 'Multan' },
    { id: '4', from: 'Peshawar', to: 'Rawalpindi' },
  ]);

  const handleSaveNewRoute = () => {
    if (!newRouteFrom || !newRouteTo) {
      Alert.alert('Validation Error', 'Please select both From and To cities.');
      return;
    }
    if (newRouteFrom === newRouteTo) {
      Alert.alert('Validation Error', 'From and To cities cannot be the same.');
      return;
    }
    const newRoute = {
      id: Date.now().toString(),
      from: newRouteFrom,
      to: newRouteTo,
    };
    if (subRoleTab === 'passenger') {
      setPassengerQuickRoutesList((prev) => [newRoute, ...prev]);
    } else {
      setDriverQuickRoutesList((prev) => [newRoute, ...prev]);
    }
    setNewRouteFrom('');
    setNewRouteTo('');
    setShowAddRouteModal(false);
    Alert.alert('Success', `Saved route added to your ${subRoleTab === 'passenger' ? 'Passenger' : 'Driver'} quick routes!`);
  };

  // Book Ride Form State
  const [bookFrom, setBookFrom] = useState('');
  const [bookTo, setBookTo] = useState('');
  const [bagsCount, setBagsCount] = useState('1');
  const [passengersCount, setPassengersCount] = useState('1');
  const [isAC, setIsAC] = useState(true);
  const [departureTime, setDepartureTime] = useState('14:00 to 15:00');

  // Real Ticking Countdown Timer (for upcoming rides)
  const [countdownSeconds, setCountdownSeconds] = useState(9918); // 02h : 45m : 18s

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
  };

  const handleSelectQuickRoute = (from: string, to: string) => {
    setFilterFromCity(from);
    setFilterToCity(to);
    setMainNavTab('home');
  };

  const handleOpenBookModal = () => {
    setBookFrom(filterFromCity || '');
    setBookTo(filterToCity || '');
    setShowBookFormModal(true);
  };

  // View Scope: 'all' (All available rides) vs 'my_rides' (Only user's own created rides)
  const [viewScope, setViewScope] = useState<'all' | 'my_rides'>('all');

  // Edit Offer Post State
  const [editingOfferPost, setEditingOfferPost] = useState<OfferRidePost | null>(null);
  const [editOfferSeats, setEditOfferSeats] = useState('');
  const [editOfferFare, setEditOfferFare] = useState('');
  const [editOfferTime, setEditOfferTime] = useState('');
  const [editOfferAC, setEditOfferAC] = useState(true);

  // Edit Book Post State
  const [editingBookPost, setEditingBookPost] = useState<BookRidePost | null>(null);
  const [editBookPassengers, setEditBookPassengers] = useState('');
  const [editBookBags, setEditBookBags] = useState('');
  const [editBookTime, setEditBookTime] = useState('');
  const [editBookAC, setEditBookAC] = useState(true);

  // Selected Detail Modals for Active Rides and Seat Requests (Screenshots 1 & 2)
  const [selectedRideDetail, setSelectedRideDetail] = useState<OfferRidePost | null>(null);
  const [selectedSeatDetail, setSelectedSeatDetail] = useState<BookRidePost | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      // In Home Screen (Middle): NO filters applied!
      // In Booking Screen (Right): Apply selected destination filters.
      const fromFilter = mainNavTab === 'booking' ? filterFromCity : '';
      const toFilter = mainNavTab === 'booking' ? filterToCity : '';

      if (subRoleTab === 'passenger') {
        // Passenger mode -> View Driver Ride Offers
        if (viewScope === 'my_rides') {
          const myPosts = await getMyOfferRidePostsLocal(userProfile.uid);
          setOfferPosts(myPosts);
        } else {
          const data = await getOfferRidePostsLocal(fromFilter, toFilter);
          setOfferPosts(data);
        }
      } else {
        // Driver mode -> View Passenger Seat Requests
        if (viewScope === 'my_rides') {
          const myPosts = await getMyBookRidePostsLocal(userProfile.uid);
          setBookPosts(myPosts);
        } else {
          const data = await getBookRidePostsLocal(fromFilter, toFilter);
          setBookPosts(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load posts', e);
    }
  }, [mainNavTab, subRoleTab, viewScope, filterFromCity, filterToCity, userProfile.uid]);

  // Notification count state
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadCitiesFromSheet();
    fetchUnreadNotifications();
  }, []);

  const fetchUnreadNotifications = async () => {
    try {
      const notifs = await getNotificationsLocal();
      const count = notifs.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch (e) {
      console.warn('Failed to load notifications count', e);
    }
  };

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

  // --- MY POSTS EDIT & DELETE HANDLERS ---
  const handleStartEditOffer = (post: OfferRidePost) => {
    setEditingOfferPost(post);
    setEditOfferSeats(post.seatsAvailable.toString());
    setEditOfferFare(post.farePerSeat.toString());
    setEditOfferTime(post.departureTime);
    setEditOfferAC(post.isAC);
  };

  const handleSaveEditOffer = async () => {
    if (!editingOfferPost) return;
    try {
      const updated: OfferRidePost = {
        ...editingOfferPost,
        seatsAvailable: parseInt(editOfferSeats, 10) || 1,
        farePerSeat: parseInt(editOfferFare, 10) || 0,
        departureTime: editOfferTime.trim() || editingOfferPost.departureTime,
        isAC: editOfferAC,
      };
      await updateOfferRidePostLocal(updated);
      setEditingOfferPost(null);
      Alert.alert('Updated', 'Your ride offer has been updated.');
      fetchPosts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update post.');
    }
  };

  const handleDeleteOffer = (postId: string) => {
    Alert.alert('Delete Ride Offer', 'Are you sure you want to delete this ride offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOfferRidePostLocal(postId);
          fetchPosts();
        },
      },
    ]);
  };

  const handleStartEditBook = (post: BookRidePost) => {
    setEditingBookPost(post);
    setEditBookPassengers(post.passengersCount.toString());
    setEditBookBags(post.bagsCount.toString());
    setEditBookTime(post.departureTime);
    setEditBookAC(post.isAC);
  };

  const handleSaveEditBook = async () => {
    if (!editingBookPost) return;
    try {
      const updated: BookRidePost = {
        ...editingBookPost,
        passengersCount: parseInt(editBookPassengers, 10) || 1,
        bagsCount: parseInt(editBookBags, 10) || 0,
        departureTime: editBookTime.trim() || editingBookPost.departureTime,
        isAC: editBookAC,
      };
      await updateBookRidePostLocal(updated);
      setEditingBookPost(null);
      Alert.alert('Updated', 'Your seat request has been updated.');
      fetchPosts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update request.');
    }
  };

  const handleDeleteBook = (postId: string) => {
    Alert.alert('Delete Request', 'Are you sure you want to delete this seat request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBookRidePostLocal(postId);
          fetchPosts();
        },
      },
    ]);
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Header matching instructions */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: 'transparent', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        {/* Left: Tappable Profile Header -> Opens Profile Screen */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
          onPress={onNavigateToProfile}
          activeOpacity={0.7}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#A5D6A7' }}>
            <Icon name="account" size={22} color="#2E7D32" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }, getTextStyle()]}>Good morning 👋</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, flexWrap: 'wrap', gap: 4 }}>
              <Text style={[{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                {userProfile.fullName || 'Faisal'}
              </Text>
              {subRoleTab === 'passenger' ? (
                (userProfile.verification?.isCNICVerified && userProfile.verification?.phoneVerified) ? (
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' }}>
                    <Icon name="check-decagram" size={12} color="#16A34A" style={{ marginRight: 3 }} />
                    <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '800' }}>Verified Passenger</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE047' }}>
                    <Icon name="alert-circle-outline" size={12} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={{ color: '#B45309', fontSize: 10, fontWeight: '800' }}>Unverified Passenger</Text>
                  </View>
                )
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {userProfile.verification?.isLicenseVerified ? (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' }}>
                      <Icon name="check-decagram" size={12} color="#16A34A" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '800' }}>Verified Driver</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE047' }}>
                      <Icon name="alert-circle-outline" size={12} color="#D97706" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#B45309', fontSize: 10, fontWeight: '800' }}>Unverified Driver</Text>
                    </View>
                  )}
                  {userProfile.verification?.isVehicleRegistrationVerified ? (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' }}>
                      <Icon name="car-check" size={12} color="#16A34A" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '800' }}>Verified Vehicle</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFEDD5' }}>
                      <Icon name="car-off-outline" size={12} color="#C2410C" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#C2410C', fontSize: 10, fontWeight: '800' }}>Unverified Vehicle</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: SOS Button + Notification Icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: '#FFCDD2' }}
            onPress={() => setShowEmergencyModal(true)}
          >
            <Icon name="shield-alert" size={18} color="#D32F2F" style={{ marginRight: 4 }} />
            <Text style={{ color: '#D32F2F', fontSize: 11, fontWeight: '800' }}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}
            onPress={onNavigateToNotifications}
          >
            <Icon name="bell-outline" size={20} color="#2E7D32" />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#D32F2F' }} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* VIEW 1: DASHBOARD SCREEN (LEFT) */}
      {mainNavTab === 'dashboard' && (
        <ScrollView contentContainerStyle={styles.feedContainer} showsVerticalScrollIndicator={false}>
          {/* Role Selector Bar */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F0', borderRadius: 14, padding: 4, marginBottom: 16 }}>
            <TouchableOpacity
              style={[{ flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, subRoleTab === 'passenger' ? { backgroundColor: theme.primary } : null]}
              onPress={() => setSubRoleTab('passenger')}
            >
              <Icon name="seat-passenger" size={18} color={subRoleTab === 'passenger' ? '#FFFFFF' : theme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[{ fontSize: 13, fontWeight: '700', color: subRoleTab === 'passenger' ? '#FFFFFF' : theme.textSecondary }, getTextStyle()]}>Passenger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[{ flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, subRoleTab === 'driver' ? { backgroundColor: theme.primary } : null]}
              onPress={() => {
                if (!hasVehicleProfile) {
                  Alert.alert(
                    'Register as Driver Required 🚗',
                    'You are not registered as a driver yet. Please go to Profile Menu and select "Register as a Driver" to submit your Driving License & Vehicle Registration.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Go to Profile Menu', onPress: onNavigateToProfile },
                    ]
                  );
                  return;
                }
                setSubRoleTab('driver');
              }}
            >
              <Icon name={hasVehicleProfile ? "car-side" : "lock"} size={18} color={subRoleTab === 'driver' ? '#FFFFFF' : (hasVehicleProfile ? theme.textSecondary : '#D97706')} style={{ marginRight: 6 }} />
              <Text style={[{ fontSize: 13, fontWeight: '700', color: subRoleTab === 'driver' ? '#FFFFFF' : (hasVehicleProfile ? theme.textSecondary : '#D97706') }, getTextStyle()]}>
                {hasVehicleProfile ? 'Driver' : 'Driver 🔒'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Trip Banner - Shown only when passenger books a seat with a driver */}
          {subRoleTab === 'passenger' && isPassengerSeatBooked && (
            <View style={{ backgroundColor: '#1B3E1E', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>Active Trip</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E7D32', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>Live</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A5D6A7', marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Islamabad (F-8)</Text>
                    <Text style={{ fontSize: 11, color: '#A5D6A7', marginLeft: 'auto', fontWeight: '700' }}>02h : 44m : 54s</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF5350', marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Lahore (Thokar)</Text>
                    <Text style={{ fontSize: 10, color: '#B0CAB2', marginLeft: 'auto' }}>Dep: 02:00 PM</Text>
                  </View>
                </View>

                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' }}
                  style={{ width: 68, height: 44, resizeMode: 'contain' }}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, marginTop: 12 }}>
                <Icon name="car" size={16} color="#A5D6A7" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '600' }}>Honda City AC • LHR-8822</Text>
              </View>
            </View>
          )}

          {/* Overview Analytics Grid (3 Equal Tiles in One Horizontal Row) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Overview</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
              <Text style={[{ fontSize: 12, color: theme.primary, fontWeight: '700' }, getTextStyle()]}>View details</Text>
            </TouchableOpacity>
          </View>

          {subRoleTab === 'passenger' ? (
            /* Passenger Mode: 2 Horizontal Tiles (Money Saved removed) */
            <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', marginBottom: 16, width: '100%' }}>
              {/* Tile 1: Trips Completed */}
              <View style={{ width: '48.5%', backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: 'space-between' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="car-multiple" size={16} color="#2E7D32" />
                </View>
                <Text style={[{ color: theme.textPrimary, fontSize: 18, fontWeight: '800' }]}>14</Text>
                <Text numberOfLines={1} style={[{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Trips Completed</Text>
                <Text numberOfLines={1} style={{ fontSize: 10, color: '#2E7D32', fontWeight: '700', marginTop: 1 }}>+12% this month</Text>
              </View>

              {/* Tile 2: Safety & Trust */}
              <TouchableOpacity
                style={{ width: '48.5%', backgroundColor: '#1B3E1E', borderColor: '#2E7D32', borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: 'space-between' }}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="shield-check" size={16} color="#FFFFFF" />
                </View>
                <Text style={[{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }]}>99%</Text>
                <Text numberOfLines={1} style={[{ fontSize: 11, fontWeight: '700', color: '#A5D6A7', marginTop: 2 }, getTextStyle()]}>Safety & Trust</Text>
                <Text numberOfLines={1} style={{ fontSize: 10, color: '#81C784', fontWeight: '700', marginTop: 1 }}>⭐ 4.9 Rating</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Driver Mode: 3 Horizontal Tiles (Includes Money Saved) */
            <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', marginBottom: 16, width: '100%' }}>
              {/* Tile 1: Trips Completed */}
              <View style={{ width: '31.5%', backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'space-between' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="car-multiple" size={14} color="#2E7D32" />
                </View>
                <Text style={[{ color: theme.textPrimary, fontSize: 16, fontWeight: '800' }]}>14</Text>
                <Text numberOfLines={1} style={[{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Trips Done</Text>
                <Text numberOfLines={1} style={{ fontSize: 9, color: '#2E7D32', fontWeight: '700', marginTop: 1 }}>+12% month</Text>
              </View>

              {/* Tile 2: Earnings */}
              <TouchableOpacity
                style={{ width: '31.5%', backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'space-between' }}
                onPress={() => setShowEarningsModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="wallet" size={14} color="#2E7D32" />
                </View>
                <Text style={[{ color: theme.textPrimary, fontSize: 15, fontWeight: '800' }]}>Rs. 14.5k</Text>
                <Text numberOfLines={1} style={[{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Earnings</Text>
                <Text numberOfLines={1} style={{ fontSize: 9, color: '#2E7D32', fontWeight: '700', marginTop: 1 }}>+18% month</Text>
              </TouchableOpacity>

              {/* Tile 3: Safety & Trust */}
              <TouchableOpacity
                style={{ width: '31.5%', backgroundColor: '#1B3E1E', borderColor: '#2E7D32', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'space-between' }}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Icon name="shield-check" size={14} color="#FFFFFF" />
                </View>
                <Text style={[{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }]}>99%</Text>
                <Text numberOfLines={1} style={[{ fontSize: 10, fontWeight: '700', color: '#A5D6A7', marginTop: 2 }, getTextStyle()]}>Safety Trust</Text>
                <Text numberOfLines={1} style={{ fontSize: 9, color: '#81C784', fontWeight: '700', marginTop: 1 }}>⭐ 4.9 Rating</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Saved Routes Hub (Role specific: Passenger vs Driver) */}
          <View style={[styles.dashCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                Quick Saved Routes
              </Text>
              <TouchableOpacity onPress={() => setShowAddRouteModal(true)}>
                <Text style={[{ fontSize: 12, color: theme.primary, fontWeight: '700' }, getTextStyle()]}>Add New</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickRoutesCardGrid}>
              {(subRoleTab === 'passenger' ? passengerQuickRoutesList : driverQuickRoutesList).map((routeItem) => (
                <TouchableOpacity
                  key={routeItem.id}
                  style={[styles.quickRouteCardItem, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => handleSelectQuickRoute(routeItem.from, routeItem.to)}
                  activeOpacity={0.7}
                >
                  <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                    {routeItem.from} ➔ {routeItem.to}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Trip History Feed (Role specific: Passenger vs Driver) */}
          <View style={[styles.dashCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={{ marginBottom: 12 }}>
              <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                Recent Completed Trip
              </Text>
            </View>

            {subRoleTab === 'passenger' ? (
              /* Recent Completed Trip for PASSENGER */
              <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
                  style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Islamabad ➔ Multan</Text>
                    <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Completed</Text>
                    </View>
                  </View>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Driver: Usman Khan • Fare: Rs. 2,200</Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>22 Jul 2026 • 01:30 PM</Text>
                </View>
              </View>
            ) : (
              /* Recent Completed Trip for DRIVER */
              <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }}
                  style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Lahore ➔ Islamabad</Text>
                    <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Completed</Text>
                    </View>
                  </View>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Passenger: Ali Raza • Fare Collected: Rs. 1,800</Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>18 Jul 2026 • 09:00 AM</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* VIEW 2: ACTIVE NOW LIVE FEED SCREEN (MIDDLE TAB) */}
      {mainNavTab === 'home' && (
        <ScrollView contentContainerStyle={styles.feedContainer} showsVerticalScrollIndicator={false}>
          {/* Real-time Pulsating Live Banner */}
          <View style={{ backgroundColor: '#1B4D1A', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#2E7D32' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>
                LIVE FEED • UPDATING REAL-TIME ⚡
              </Text>
            </View>
            <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                {subRoleTab === 'passenger' ? `${offerPosts.length} Active Rides` : `${bookPosts.length} Active Requests`}
              </Text>
            </View>
          </View>

          {/* Unverified User Prompt (Per Handwritten Note Page 1) */}
          {!(userProfile?.isVerified || (userProfile?.verification?.isCNICVerified && userProfile?.verification?.phoneVerified !== false)) && (
            <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Icon name="shield-alert" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontWeight: '800', color: '#92400E' }, getTextStyle()]}>
                  Account Verification Required 🛡️
                </Text>
                <Text style={[{ fontSize: 11, color: '#B45309', marginTop: 2 }, getTextStyle()]}>
                  Verify your account (CNIC & Phone) in Profile to unlock full live ride details, book rides, & set up a Driver profile.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#D97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }}
                  onPress={onNavigateToProfile}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Verify Account Now ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Posts Live Feed Cards */}
          <View style={{ padding: 16 }}>
            {subRoleTab === 'passenger' ? (
              offerPosts.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Icon name="car-off" size={40} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }, getTextStyle()]}>
                    {t('noRidesFound')}
                  </Text>
                </View>
              ) : (
                offerPosts.map((post, idx) => {
                  const isMine = post.driverUid === userProfile.uid;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 14,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                      onPress={() => setSelectedRideDetail(post)}
                      activeOpacity={0.85}
                    >
                      {/* Live User Header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ position: 'relative', marginRight: 10 }}>
                            <Image
                              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }}
                              style={{ width: 40, height: 40, borderRadius: 20 }}
                            />
                            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                          </View>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                                {post.driverName}
                              </Text>
                              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 6 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#2E7D32' }}>✓ Verified</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>⭐ 4.9 Driver • Live Feed</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {isMine && (
                            <View style={{ backgroundColor: '#1B3E1E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>MY POST</Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Live ⚡</Text>
                          </View>
                        </View>
                      </View>

                      {/* Route Banner Box */}
                      <View style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[{ fontSize: 15, fontWeight: '900', color: '#1B3E1E' }, getTextStyle()]}>
                            {post.fromCity} ➔ {post.toCity}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E7D32' }}>
                            Rs. {post.farePerSeat} / seat
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>
                            🕒 Dep: {post.departureTime}
                          </Text>
                          <Text style={[{ fontSize: 11, fontWeight: '800', color: post.seatsAvailable > 0 ? '#16A34A' : '#DC2626' }, getTextStyle()]}>
                            {post.seatsAvailable} Seat{post.seatsAvailable > 1 ? 's' : ''} Left
                          </Text>
                        </View>
                      </View>

                      {/* Action Row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>🚗 {post.vehicleDetails}</Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => setSelectedRideDetail(post)}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>View Live Details ➔</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              bookPosts.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Icon name="account-search" size={40} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }, getTextStyle()]}>
                    {isUrdu ? 'کوئی درخواست نہیں ملی' : 'No Passenger Requests Found'}
                  </Text>
                </View>
              ) : (
                bookPosts.map((post) => {
                  const isMine = post.passengerUid === userProfile.uid;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 14,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                      onPress={() => setSelectedSeatDetail(post)}
                      activeOpacity={0.85}
                    >
                      {/* Passenger Header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ position: 'relative', marginRight: 10 }}>
                            <Image
                              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
                              style={{ width: 40, height: 40, borderRadius: 20 }}
                            />
                            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
                          </View>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                                {post.passengerName}
                              </Text>
                              <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 6 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#E65100' }}>Passenger Request</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>⭐ 4.9 Passenger • Live Request</Text>
                          </View>
                        </View>

                        {isMine && (
                          <View style={{ backgroundColor: '#1B3E1E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>MY REQUEST</Text>
                          </View>
                        )}
                      </View>

                      {/* Route Request Pill Box */}
                      <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFEDD5', borderRadius: 12, padding: 10, marginBottom: 10 }}>
                        <Text style={[{ fontSize: 15, fontWeight: '900', color: '#C2410C', marginBottom: 4 }, getTextStyle()]}>
                          {post.fromCity} ➔ {post.toCity}
                        </Text>
                        <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>
                          🕒 Requested Dep Time: {post.departureTime}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>🧳 Seat Request Live</Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#E65100', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => setSelectedSeatDetail(post)}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Accept Request ➔</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* VIEW 3: BOOKING SCREEN (RIGHT) (Mockup Image 5) */}
      {mainNavTab === 'booking' && (
        <ScrollView contentContainerStyle={styles.feedContainer}>
          {/* Destination Filter Panel */}
          <View style={[styles.filterCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.filterTitle, { color: theme.primary }, getTextStyle()]}>
              <Icon name="filter-variant" size={16} color={theme.primary} /> {t('applyFiltersTitle')}
            </Text>
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => setShowFromPicker(true)}>
                <Text style={[filterFromCity ? [styles.filterValueText, { color: theme.textPrimary }] : [styles.filterPlaceholder, { color: theme.textMuted }], getTextStyle()]}>
                  {filterFromCity || t('fromCity')}
                </Text>
                <Icon name="chevron-down" size={18} color={theme.textMuted} />
              </TouchableOpacity>

              <Icon name="arrow-right" size={20} color={theme.textMuted} style={styles.arrowIcon} />

              <TouchableOpacity style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => setShowToPicker(true)}>
                <Text style={[filterToCity ? [styles.filterValueText, { color: theme.textPrimary }] : [styles.filterPlaceholder, { color: theme.textMuted }], getTextStyle()]}>
                  {filterToCity || t('toCity')}
                </Text>
                <Icon name="chevron-down" size={18} color={theme.textMuted} />
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
                <Text style={[styles.clearFilterText, { color: theme.primary }, getTextStyle()]}>{t('clearFilters')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.bookingActionBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (subRoleTab === 'driver') {
                onNavigateToCreateRide(filterFromCity, filterToCity);
              } else {
                handleOpenBookModal();
              }
            }}
          >
            <Icon name="plus-circle" size={22} color={theme.white} style={{ marginRight: 8 }} />
            <Text style={[styles.bookingActionBtnText, { color: theme.white }, getTextStyle()]}>
              {subRoleTab === 'driver' ? t('offerRideBtn') : t('postSeatRequestBtn')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}



      {/* Full Screen Book Ride / Seat Request Form Modal (Mockup Image 5) */}
      <Modal visible={showBookFormModal} animationType="slide" transparent={false} onRequestClose={() => setShowBookFormModal(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowBookFormModal(false)}>
              <Icon name="arrow-left" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }, getTextStyle()]}>
              {t('postSeatRequestBtn')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Route & Locations Card */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.primary }, getTextStyle()]}>ROUTE & LOCATIONS</Text>

              <Text style={[styles.inputLabel, { color: theme.textPrimary }, getTextStyle()]}>{t('fromCity')}</Text>
              <TouchableOpacity style={[styles.pickerSelector, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => setShowFromPicker(true)}>
                <Icon name="help-circle-outline" size={20} color={theme.primary} style={styles.pickerIcon} />
                <Text style={[styles.pickerSelectorText, !bookFrom ? { color: theme.textMuted } : { color: theme.textPrimary }, getTextStyle()]}>
                  {bookFrom || t('selectDepartureCity')}
                </Text>
                <Icon name="chevron-down" size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <TextInput
                style={[styles.detailInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
                placeholder="Landmark/Pickup details (e.g. Metro Pole, Gate 3)"
                placeholderTextColor={theme.textMuted}
              />

              <View style={styles.routeDivider} />

              <Text style={[styles.inputLabel, { color: theme.textPrimary }, getTextStyle()]}>{t('toCity')}</Text>
              <TouchableOpacity style={[styles.pickerSelector, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => setShowToPicker(true)}>
                <Icon name="help-circle-outline" size={20} color={theme.primary} style={styles.pickerIcon} />
                <Text style={[styles.pickerSelectorText, !bookTo ? { color: theme.textMuted } : { color: theme.textPrimary }, getTextStyle()]}>
                  {bookTo || t('selectDestinationCity')}
                </Text>
                <Icon name="chevron-down" size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <TextInput
                style={[styles.detailInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
                placeholder="Dropoff details (e.g. Block 5, next to mall)"
                placeholderTextColor={theme.textMuted}
              />

              {/* Air Conditioning Toggle */}
              <View style={styles.switchContainer}>
                <View>
                  <Text style={[styles.switchLabel, { color: theme.textPrimary }, getTextStyle()]}>Air Conditioning (AC)</Text>
                  <Text style={[{ fontSize: 12, color: theme.textSecondary }, getTextStyle()]}>Enable AC premium tier pricing</Text>
                </View>
                <TouchableOpacity style={[styles.toggleACBtn, { backgroundColor: isAC ? theme.primaryBackground : '#FFF3E0' }]} onPress={() => setIsAC(!isAC)}>
                  <Icon name={isAC ? 'snowflake' : 'fan'} size={18} color={isAC ? theme.primary : '#E65100'} />
                  <Text style={{ marginLeft: 6, fontWeight: '700', color: isAC ? theme.primary : '#E65100' }}>
                    {isAC ? 'AC' : 'Non-AC'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 12 }, getTextStyle()]}>Number of Passengers *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
                keyboardType="numeric"
                value={passengersCount}
                onChangeText={setPassengersCount}
              />

              <Text style={[styles.inputLabel, { color: theme.textPrimary }, getTextStyle()]}>Number of Bags</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
                keyboardType="numeric"
                value={bagsCount}
                onChangeText={setBagsCount}
              />

              <Text style={[styles.inputLabel, { color: theme.textPrimary }, getTextStyle()]}>{t('departureTime')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }]}
                value={departureTime}
                onChangeText={setDepartureTime}
              />

              {/* Fare Summary (From Google Sheet) */}
              <View style={[styles.fareCardBox, { backgroundColor: theme.primaryBackground, borderColor: theme.primaryBorder, marginTop: 12 }]}>
                <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.primary, marginBottom: 6 }, getTextStyle()]}>
                  FARE SUMMARY (FROM GOOGLE SHEET)
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[{ fontSize: 13, color: theme.textSecondary }, getTextStyle()]}>Tier Option:</Text>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>
                    {isAC ? 'AC Premium' : 'Non-AC Standard'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>Fare per seat:</Text>
                  <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.primary }]}>Rs. 1800.00</Text>
                </View>
              </View>
            </View>

            {/* Submit Button at Bottom */}
            <TouchableOpacity
              style={[styles.submitFormBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreatePassengerRequest}
            >
              <Text style={[styles.submitFormBtnText, { color: theme.white }, getTextStyle()]}>
                {t('submitPassengerRequest')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Emergency Contacts Modal */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent onRequestClose={() => setShowEmergencyModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEmergencyModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border, maxHeight: 560 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="shield-alert" size={28} color="#D32F2F" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[{ fontSize: 17, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                    {isUrdu ? 'ہنگامی امدادی مرکز (SOS)' : 'Emergency SOS Dispatch Center'}
                  </Text>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>
                    {isUrdu ? 'تمام اہم قومی ہیلپ لائنز اور آپ کے 3 ذاتی ہنگامی نمبرز' : 'Official Helplines & Up to 3 Personal Emergency Contacts'}
                  </Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* OFFICIAL HELPLINES SECTION */}
                <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.primary, marginBottom: 8 }, getTextStyle()]}>
                  OFFICIAL NATIONAL HELPLINES 🇵🇰
                </Text>

                {/* 15 Police Helpline */}
                <View style={[styles.emergencyCardDefault, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginBottom: 8 }]}>
                  <View>
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'پولیس ایمرجنسی ہیلپ لائن' : 'Police Emergency Helpline'}</Text>
                    <Text style={[{ fontSize: 15, fontWeight: '800', color: '#D32F2F', marginTop: 2 }]}>15</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: '#D32F2F', marginRight: 6 }]} onPress={() => handleTriggerEmergencySMS('15')}>
                      <Icon name="message-text" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: theme.primary }]} onPress={() => handleTriggerEmergencyCall('15')}>
                      <Icon name="phone" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 130 NHMP Motorway Police */}
                <View style={[styles.emergencyCardDefault, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginBottom: 8 }]}>
                  <View>
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'موٹروے پولیس ہیلپ لائن' : 'NHMP Motorway Police'}</Text>
                    <Text style={[{ fontSize: 15, fontWeight: '800', color: theme.primary, marginTop: 2 }]}>130</Text>
                  </View>
                  <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: theme.primary }]} onPress={() => handleTriggerEmergencyCall('130')}>
                    <Icon name="phone" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* 1122 Rescue Ambulance */}
                <View style={[styles.emergencyCardDefault, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginBottom: 12 }]}>
                  <View>
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>{isUrdu ? 'ریسکیو 1122 ایمبولینس' : 'Rescue 1122 Ambulance'}</Text>
                    <Text style={[{ fontSize: 15, fontWeight: '800', color: theme.primary, marginTop: 2 }]}>1122</Text>
                  </View>
                  <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: theme.primary }]} onPress={() => handleTriggerEmergencyCall('1122')}>
                    <Icon name="phone" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* USER'S PERSONAL EMERGENCY CONTACTS (UP TO 3) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                  <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.primary }, getTextStyle()]}>
                    PERSONAL CONTACTS (UP TO 3)
                  </Text>
                  <TouchableOpacity onPress={() => { setShowEmergencyModal(false); onNavigateToProfile(); }}>
                    <Text style={[{ fontSize: 11, fontWeight: '700', color: theme.primary }, getTextStyle()]}>+ Edit in Profile</Text>
                  </TouchableOpacity>
                </View>

                {userProfile.emergencyContacts && userProfile.emergencyContacts.length > 0 ? (
                  userProfile.emergencyContacts.map((contact) => (
                    <View key={contact.id} style={[styles.emergencyCardDefault, { backgroundColor: theme.primaryBackground, borderColor: theme.primaryBorder, marginBottom: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                          {contact.name} ({contact.relation || 'Contact'})
                        </Text>
                        <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.primary, marginTop: 2 }, getTextStyle()]}>
                          {contact.phone}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: '#D32F2F', marginRight: 6 }]} onPress={() => handleTriggerEmergencySMS(contact.phone)}>
                          <Icon name="message-text" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.callIconBtn, { backgroundColor: theme.primary }]} onPress={() => handleTriggerEmergencyCall(contact.phone)}>
                          <Icon name="phone" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emergencyCardDefault, { backgroundColor: theme.inputBackground, borderColor: theme.border, marginBottom: 8 }]}>
                    <Text style={[{ fontSize: 12, color: theme.textSecondary }, getTextStyle()]}>
                      No personal contacts added yet. Tap "+ Edit in Profile" to add up to 3 contacts.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  onPress={() => setShowEmergencyModal(false)}
                >
                  <Text style={[{ color: '#2E7D32', fontWeight: '800', fontSize: 14 }, getTextStyle()]}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* From City Picker Modal */}
      <Modal visible={showFromPicker} transparent animationType="fade" onRequestClose={() => setShowFromPicker(false)}>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowFromPicker(false)}
        >
          <TouchableWithoutFeedback>
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
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* To City Picker Modal */}
      <Modal visible={showToPicker} transparent animationType="fade" onRequestClose={() => setShowToPicker(false)}>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowToPicker(false)}
        >
          <TouchableWithoutFeedback>
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
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Edit Offer Ride Modal */}
      <Modal visible={!!editingOfferPost} animationType="slide" transparent onRequestClose={() => setEditingOfferPost(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingOfferPost(null)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Modify Ride Offer</Text>
              <Text style={{ fontSize: 13, color: '#43A047', fontWeight: '700', marginBottom: 12 }}>
                {editingOfferPost?.fromCity} ➔ {editingOfferPost?.toCity}
              </Text>

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.label}>Seats Available *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={editOfferSeats} onChangeText={setEditOfferSeats} />

                <Text style={styles.label}>Fare Per Seat (Rs.) *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={editOfferFare} onChangeText={setEditOfferFare} />

                <Text style={styles.label}>Departure Time *</Text>
                <TextInput style={styles.input} value={editOfferTime} onChangeText={setEditOfferTime} />

                <TouchableOpacity style={styles.toggleACBtn} onPress={() => setEditOfferAC(!editOfferAC)}>
                  <Icon name={editOfferAC ? 'snowflake' : 'fan'} size={20} color={editOfferAC ? '#43A047' : '#E65100'} />
                  <Text style={{ marginLeft: 8, fontWeight: '700' }}>
                    Vehicle AC: {editOfferAC ? 'Air Conditioned (AC)' : 'Non-AC'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingOfferPost(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEditOffer}>
                  <Text style={styles.confirmBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Edit Book Request Modal */}
      <Modal visible={!!editingBookPost} animationType="slide" transparent onRequestClose={() => setEditingBookPost(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingBookPost(null)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Modify Seat Request</Text>
              <Text style={{ fontSize: 13, color: '#E65100', fontWeight: '700', marginBottom: 12 }}>
                {editingBookPost?.fromCity} ➔ {editingBookPost?.toCity}
              </Text>

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.label}>Number of Passengers *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={editBookPassengers} onChangeText={setEditBookPassengers} />

                <Text style={styles.label}>Number of Bags</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={editBookBags} onChangeText={setEditBookBags} />

                <Text style={styles.label}>Departure Time *</Text>
                <TextInput style={styles.input} value={editBookTime} onChangeText={setEditBookTime} />

                <TouchableOpacity style={styles.toggleACBtn} onPress={() => setEditBookAC(!editBookAC)}>
                  <Icon name={editBookAC ? 'snowflake' : 'fan'} size={20} color={editBookAC ? '#43A047' : '#E65100'} />
                  <Text style={{ marginLeft: 8, fontWeight: '700' }}>
                    Preference: {editBookAC ? 'Air Conditioned (AC)' : 'Non-AC'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingBookPost(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEditBook}>
                  <Text style={styles.confirmBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>


      {/* Active Ride Detail View Modal (Clickable Screenshot 1 Card) */}
      <Modal visible={!!selectedRideDetail} animationType="slide" transparent onRequestClose={() => setSelectedRideDetail(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedRideDetail(null)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border, padding: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={[styles.routeBadge, { backgroundColor: theme.primaryBackground, paddingHorizontal: 12, paddingVertical: 6 }]}>
                  <Text style={[styles.routeBadgeText, { color: theme.primary, fontSize: 14 }, getTextStyle()]}>
                    {selectedRideDetail?.fromCity} ➔ {selectedRideDetail?.toCity}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedRideDetail(null)} style={{ padding: 4 }}>
                  <Icon name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }, getTextStyle()]}>
                Driver: {selectedRideDetail?.driverName}
              </Text>

              {/* Pre-Booking Privacy View (Handwritten Notes Rule 1) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>⭐ 4.9 Rating (32 Reviews)</Text>
                </View>
                <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>99% Trust Score</Text>
                </View>
              </View>

              <Text style={[{ fontSize: 13, color: theme.textSecondary, marginBottom: 3 }, getTextStyle()]}>
                Vehicle: {selectedRideDetail?.vehicleDetails}
              </Text>
              
              <Text style={[{ fontSize: 11, color: '#D97706', fontWeight: '700', marginBottom: 6 }, getTextStyle()]}>
                🔒 Vehicle Registration No: Revealed after driver accepts booking
              </Text>

              <Text style={[{ fontSize: 13, color: theme.textSecondary, marginBottom: 14 }, getTextStyle()]}>
                Departure Window: {selectedRideDetail?.departureTime}
              </Text>

              {/* Fare & Seat Summary Box */}
              <View style={[styles.liveInfoBox, { backgroundColor: theme.primaryBackground, borderColor: theme.primaryBorder, padding: 14, marginBottom: 18 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>Seats Available:</Text>
                  <Text style={[{ fontSize: 16, fontWeight: '800', color: theme.primary }]}>{selectedRideDetail?.seatsAvailable} Seats Left</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>Fare Rate:</Text>
                  <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.primary }]}>Rs. {selectedRideDetail?.farePerSeat} / seat</Text>
                </View>
              </View>

              {/* Action Buttons: WhatsApp, Call, Send Booking Request */}
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#25D366' }]}
                onPress={() => {
                  Linking.openURL(`https://wa.me/923449793574?text=Hi%20${encodeURIComponent(selectedRideDetail?.driverName || '')}%2C%20I%20want%20to%20book%20a%20seat%20from%20${encodeURIComponent(selectedRideDetail?.fromCity || '')}%20to%20${encodeURIComponent(selectedRideDetail?.toCity || '')}.`);
                }}
              >
                <Icon name="whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>WhatsApp Driver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleTriggerEmergencyCall('03449793574')}
              >
                <Icon name="phone" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>Call Driver Directly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2E7D32', marginTop: 4 }]}
                onPress={() => {
                  setSelectedRideDetail(null);
                  Alert.alert('Booking Request Sent! 🚗', `Your seat booking request for ${selectedRideDetail?.fromCity} to ${selectedRideDetail?.toCity} has been dispatched to ${selectedRideDetail?.driverName}.`);
                }}
              >
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>Send Seat Booking Request</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Active Seat Request Detail View Modal (Clickable Screenshot 2 Card) */}
      <Modal visible={!!selectedSeatDetail} animationType="slide" transparent onRequestClose={() => setSelectedSeatDetail(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSeatDetail(null)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border, padding: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={[styles.routeBadgeBook, { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6 }]}>
                  <Text style={[styles.routeBadgeTextBook, { fontSize: 14 }, getTextStyle()]}>
                    {selectedSeatDetail?.fromCity} ➔ {selectedSeatDetail?.toCity}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSeatDetail(null)} style={{ padding: 4 }}>
                  <Icon name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }, getTextStyle()]}>
                Passenger: {selectedSeatDetail?.passengerName}
              </Text>
              <Text style={[{ fontSize: 13, color: theme.textSecondary, marginBottom: 18 }, getTextStyle()]}>
                Requested Departure Time: {selectedSeatDetail?.departureTime}
              </Text>

              {/* Action Buttons for Driver */}
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#25D366' }]}
                onPress={() => {
                  Linking.openURL(`https://wa.me/923449793574?text=Hi%20${encodeURIComponent(selectedSeatDetail?.passengerName || '')}%2C%20I%20have%20an%20available%20seat%20for%20your%20ride%20to%20${encodeURIComponent(selectedSeatDetail?.toCity || '')}.`);
                }}
              >
                <Icon name="whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>WhatsApp Passenger</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleTriggerEmergencyCall('03449793574')}
              >
                <Icon name="phone" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>Call Passenger Directly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2E7D32', marginTop: 4 }]}
                onPress={() => {
                  setSelectedSeatDetail(null);
                  Alert.alert('Seat Offer Sent! 🤝', `You offered a seat to ${selectedSeatDetail?.passengerName} for the route ${selectedSeatDetail?.fromCity} to ${selectedSeatDetail?.toCity}.`);
                }}
              >
                <Text style={[styles.modalActionBtnText, getTextStyle()]}>Offer Seat to Passenger</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Public Ratings & Reviews Modal */}
      <RatingsModal
        visible={showRatingsModal}
        onClose={() => setShowRatingsModal(false)}
        userProfile={userProfile}
      />

      {/* Add New Route Modal */}
      <Modal visible={showAddRouteModal} animationType="slide" transparent onRequestClose={() => setShowAddRouteModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddRouteModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border, padding: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[{ fontSize: 18, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                  Save New Route
                </Text>
                <TouchableOpacity onPress={() => setShowAddRouteModal(false)} style={{ padding: 4 }}>
                  <Icon name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 13, color: theme.textSecondary, marginBottom: 14 }, getTextStyle()]}>
                Select From & To cities from existing list of cities to save route.
              </Text>

              <Text style={styles.label}>From City *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowNewRouteFromPicker(true)}>
                <Text style={{ color: newRouteFrom ? theme.textPrimary : theme.textMuted }}>
                  {newRouteFrom || 'Select From City'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>To City *</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowNewRouteToPicker(true)}>
                <Text style={{ color: newRouteTo ? theme.textPrimary : theme.textMuted }}>
                  {newRouteTo || 'Select To City'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.modalActions, { marginTop: 16 }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddRouteModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#2E7D32' }]} onPress={handleSaveNewRoute}>
                  <Text style={styles.confirmBtnText}>Save Route</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* New Route From City Picker Modal */}
      <Modal visible={showNewRouteFromPicker} transparent animationType="fade" onRequestClose={() => setShowNewRouteFromPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowNewRouteFromPicker(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select From City</Text>
              <FlatList
                data={sheetCities}
                keyExtractor={(item) => 'new_from_' + item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setNewRouteFrom(item);
                      setShowNewRouteFromPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* New Route To City Picker Modal */}
      <Modal visible={showNewRouteToPicker} transparent animationType="fade" onRequestClose={() => setShowNewRouteToPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowNewRouteToPicker(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Select To City</Text>
              <FlatList
                data={sheetCities}
                keyExtractor={(item) => 'new_to_' + item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setNewRouteTo(item);
                      setShowNewRouteToPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Complete Trip History & Trust Score Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent onRequestClose={() => setShowHistoryModal(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={{ padding: 4 }}>
              <Icon name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
              Trip History & Trust Score
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {/* Dynamic Trust Score Banner */}
            {(() => {
              const isDriverMode = subRoleTab === 'driver';
              const trust = calculateTrustScore(userProfile, null, 14, 4.9, isDriverMode);
              return (
                <>
                  <View style={{ backgroundColor: '#1B3E1E', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                        {isDriverMode ? 'Driver Safety & Trust Score' : 'Passenger Safety & Trust Score'}
                      </Text>
                      <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{trust.totalScore}% {trust.tierLabel}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#A5D6A7', fontSize: 11 }}>Trips Completed</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>{trust.pillars.completedTrips.count} Rides</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#A5D6A7', fontSize: 11 }}>User Rating</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>⭐ {trust.pillars.ratingsAndReviews.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Pillars Calculation Breakdown */}
                  <View style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }, getTextStyle()]}>
                      Score Calculation Breakdown ({isDriverMode ? '4 Pillars' : '3 Pillars'})
                    </Text>

                    {/* Pillar 1: User Verification */}
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                      onPress={() => {
                        setShowHistoryModal(false);
                        onNavigateToProfile();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                          <Icon name="shield-check" size={15} color="#2E7D32" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>1. User Identity Verification</Text>
                            <Icon name="chevron-right" size={14} color={theme.primary} style={{ marginLeft: 2 }} />
                          </View>
                          <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>{trust.pillars.userVerification.details}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: trust.pillars.userVerification.isComplete ? '#2E7D32' : '#D97706' }}>
                          {trust.pillars.userVerification.score}/{trust.pillars.userVerification.max} pts
                        </Text>
                        {!trust.pillars.userVerification.isComplete && (
                          <Text style={{ fontSize: 9, color: '#D97706', fontWeight: '800', marginTop: 1 }}>Verify Now ➔</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Pillar 2: Driver & Vehicle Verification (Only for Driver Profile) */}
                    {isDriverMode && trust.pillars.driverVehicleVerification && (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                        onPress={() => {
                          setShowHistoryModal(false);
                          onNavigateToVehicleConfig();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Icon name="car-check" size={15} color="#2E7D32" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>2. Driver & Vehicle Verification</Text>
                              <Icon name="chevron-right" size={14} color={theme.primary} style={{ marginLeft: 2 }} />
                            </View>
                            <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>{trust.pillars.driverVehicleVerification.details}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: trust.pillars.driverVehicleVerification.isComplete ? '#2E7D32' : '#D97706' }}>
                            {trust.pillars.driverVehicleVerification.score}/{trust.pillars.driverVehicleVerification.max} pts
                          </Text>
                          {!trust.pillars.driverVehicleVerification.isComplete && (
                            <Text style={{ fontSize: 9, color: '#D97706', fontWeight: '800', marginTop: 1 }}>Verify Now ➔</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Successfully Completed Trips */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                          <Icon name="check-all" size={15} color="#2E7D32" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                            {isDriverMode ? '3. Successfully Completed Trips' : '2. Successfully Completed Trips'}
                          </Text>
                          <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>{trust.pillars.completedTrips.details}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E7D32' }}>{trust.pillars.completedTrips.score}/{trust.pillars.completedTrips.max} pts</Text>
                    </View>

                    {/* Rating & Reviews */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                          <Icon name="star" size={15} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                            {isDriverMode ? '4. Rating & Reviews' : '3. Rating & Reviews'}
                          </Text>
                          <Text style={[{ fontSize: 11, color: theme.textSecondary }, getTextStyle()]}>{trust.pillars.ratingsAndReviews.details}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E7D32' }}>{trust.pillars.ratingsAndReviews.score}/{trust.pillars.ratingsAndReviews.max} pts</Text>
                    </View>
                  </View>
                </>
              );
            })()}

            {/* Complete List of Shared Trips */}
            <Text style={[{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }, getTextStyle()]}>
              All Shared Trips
            </Text>

            <View style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Islamabad ➔ Multan</Text>
                <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Completed</Text>
                </View>
              </View>
              <Text style={[{ fontSize: 12, color: theme.textSecondary }, getTextStyle()]}>Driver: Usman Khan • Fare: Rs. 2,200</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>22 Jul 2026 • 01:30 PM</Text>
            </View>

            <View style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Lahore ➔ Islamabad</Text>
                <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Completed</Text>
                </View>
              </View>
              <Text style={[{ fontSize: 12, color: theme.textSecondary }, getTextStyle()]}>Driver: Ali Raza • Fare: Rs. 1,800</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>18 Jul 2026 • 09:00 AM</Text>
            </View>

            <View style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Rawalpindi ➔ Peshawar</Text>
                <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>Completed</Text>
                </View>
              </View>
              <Text style={[{ fontSize: 12, color: theme.textSecondary }, getTextStyle()]}>Driver: Hamza Tariq • Fare: Rs. 1,400</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>10 Jul 2026 • 04:15 PM</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Driver Earnings & Trip Details Modal */}
      <Modal visible={showEarningsModal} animationType="slide" transparent onRequestClose={() => setShowEarningsModal(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={() => setShowEarningsModal(false)} style={{ padding: 4 }}>
              <Icon name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
              Driver Earnings & Trip Breakdown
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {/* Filter Selector Card */}
            <View style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 }, getTextStyle()]}>
                Filter Earnings & Trips
              </Text>

              {/* Filter Mode Selector Pills */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: earningsFilterMode === 'monthly' ? '#2E7D32' : 'transparent',
                  }}
                  onPress={() => setEarningsFilterMode('monthly')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: earningsFilterMode === 'monthly' ? '#FFFFFF' : '#4B5563' }}>
                    Monthly Filter
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: earningsFilterMode === 'custom' ? '#2E7D32' : 'transparent',
                  }}
                  onPress={() => setEarningsFilterMode('custom')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: earningsFilterMode === 'custom' ? '#FFFFFF' : '#4B5563' }}>
                    Custom Date Range
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Monthly Mode: Month Selection Pills with 1st to End Date indicators */}
              {earningsFilterMode === 'monthly' ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                  {[
                    { month: 'July 2026', range: '01 Jul - 31 Jul' },
                    { month: 'June 2026', range: '01 Jun - 30 Jun' },
                    { month: 'May 2026', range: '01 May - 31 May' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.month}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedMonth === item.month ? '#2E7D32' : theme.border,
                        backgroundColor: selectedMonth === item.month ? '#E8F5E9' : theme.cardBackground,
                        alignItems: 'center',
                      }}
                      onPress={() => setSelectedMonth(item.month)}
                    >
                      <Text style={[{ fontSize: 11, fontWeight: '800', color: selectedMonth === item.month ? '#2E7D32' : theme.textPrimary }, getTextStyle()]}>
                        {item.month}
                      </Text>
                      <Text style={{ fontSize: 9, color: selectedMonth === item.month ? '#2E7D32' : '#9CA3AF', marginTop: 2 }}>
                        {item.range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                /* Custom Date Range Inputs */
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }, getTextStyle()]}>Start Date</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: theme.textPrimary, backgroundColor: theme.background }}
                      value={customStartDate}
                      onChangeText={setCustomStartDate}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textSecondary, marginTop: 14 }}>➔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }, getTextStyle()]}>End Date</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: theme.textPrimary, backgroundColor: theme.background }}
                      value={customEndDate}
                      onChangeText={setCustomEndDate}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              )}
            </View>

            {(() => {
              const ALL_DRIVER_EARNINGS_TRIPS = [
                // July 2026
                { id: '1', route: 'Islamabad ➔ Multan', fare: 2200, passenger: 'Usman Khan', seats: 2, monthKey: 'July 2026', dateStr: '22 Jul 2026 • 01:30 PM', day: 22 },
                { id: '2', route: 'Lahore ➔ Islamabad', fare: 1800, passenger: 'Ali Raza', seats: 1, monthKey: 'July 2026', dateStr: '18 Jul 2026 • 09:00 AM', day: 18 },
                { id: '3', route: 'Rawalpindi ➔ Faisalabad', fare: 1500, passenger: 'Hamza Tariq', seats: 1, monthKey: 'July 2026', dateStr: '12 Jul 2026 • 02:15 PM', day: 12 },
                { id: '4', route: 'Multan ➔ Lahore', fare: 2400, passenger: 'Zaid Khan', seats: 2, monthKey: 'July 2026', dateStr: '05 Jul 2026 • 11:00 AM', day: 5 },

                // June 2026
                { id: '5', route: 'Peshawar ➔ Islamabad', fare: 1600, passenger: 'Bilal Ahmed', seats: 1, monthKey: 'June 2026', dateStr: '28 Jun 2026 • 03:00 PM', day: 28 },
                { id: '6', route: 'Lahore ➔ Multan', fare: 2100, passenger: 'Saad Malik', seats: 2, monthKey: 'June 2026', dateStr: '20 Jun 2026 • 10:30 AM', day: 20 },
                { id: '7', route: 'Faisalabad ➔ Lahore', fare: 1400, passenger: 'Omer Farooq', seats: 1, monthKey: 'June 2026', dateStr: '14 Jun 2026 • 08:15 AM', day: 14 },
                { id: '8', route: 'Islamabad ➔ Rawalpindi', fare: 800, passenger: 'Hassan Nawaz', seats: 1, monthKey: 'June 2026', dateStr: '04 Jun 2026 • 05:45 PM', day: 4 },

                // May 2026
                { id: '9', route: 'Multan ➔ Faisalabad', fare: 1700, passenger: 'Kashif Mehmood', seats: 1, monthKey: 'May 2026', dateStr: '25 May 2026 • 01:00 PM', day: 25 },
                { id: '10', route: 'Lahore ➔ Peshawar', fare: 2800, passenger: 'Tariq Jameel', seats: 2, monthKey: 'May 2026', dateStr: '17 May 2026 • 07:30 AM', day: 17 },
                { id: '11', route: 'Islamabad ➔ Multan', fare: 2200, passenger: 'Asad Ali', seats: 2, monthKey: 'May 2026', dateStr: '09 May 2026 • 12:45 PM', day: 9 },
              ];

              const filteredEarningsTrips = ALL_DRIVER_EARNINGS_TRIPS.filter(trip => {
                if (earningsFilterMode === 'monthly') {
                  return trip.monthKey === selectedMonth;
                } else {
                  const startDay = parseInt(customStartDate.split('/')[0] || '1', 10);
                  const endDay = parseInt(customEndDate.split('/')[0] || '31', 10);
                  return trip.day >= startDay && trip.day <= endDay;
                }
              });

              const totalEarningsAmount = filteredEarningsTrips.reduce((acc, t) => acc + t.fare, 0);
              const totalPassengersCount = filteredEarningsTrips.reduce((acc, t) => acc + t.seats, 0);
              const avgPerPassenger = totalPassengersCount > 0 ? Math.round(totalEarningsAmount / totalPassengersCount) : 0;

              // Dynamic Real-time Growth calculation compared to previous period/month
              let previousPeriodKey = '';
              if (selectedMonth === 'July 2026') previousPeriodKey = 'June 2026';
              else if (selectedMonth === 'June 2026') previousPeriodKey = 'May 2026';
              else if (selectedMonth === 'May 2026') previousPeriodKey = 'April 2026';

              const prevPeriodEarnings = ALL_DRIVER_EARNINGS_TRIPS
                .filter(t => t.monthKey === previousPeriodKey)
                .reduce((acc, t) => acc + t.fare, 0) || (selectedMonth === 'May 2026' ? 5200 : 0);

              let growthPercentage = 0;
              if (prevPeriodEarnings > 0) {
                growthPercentage = Math.round(((totalEarningsAmount - prevPeriodEarnings) / prevPeriodEarnings) * 100);
              } else if (totalEarningsAmount > 0) {
                growthPercentage = 100;
              }

              const isPositiveGrowth = growthPercentage >= 0;
              const growthText = `${isPositiveGrowth ? '+' : ''}${growthPercentage}% ${isPositiveGrowth ? '📈' : '📉'}`;

              return (
                <>
                  {/* Total Earnings Summary Card */}
                  <View style={{ backgroundColor: '#1B3E1E', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Total Driver Earnings</Text>
                      <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          {earningsFilterMode === 'monthly' ? selectedMonth : `${customStartDate} - ${customEndDate}`}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 4 }}>
                      Rs. {totalEarningsAmount.toLocaleString()}
                    </Text>
                    <Text style={{ color: '#A5D6A7', fontSize: 11, marginTop: 2 }}>Real-time earnings updated after each completed trip</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                      <View>
                        <Text style={{ color: '#A5D6A7', fontSize: 11 }}>Trips Done</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{filteredEarningsTrips.length} Rides</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#A5D6A7', fontSize: 11 }}>Collected / Passenger</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>Rs. {avgPerPassenger.toLocaleString()} avg</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#A5D6A7', fontSize: 11 }}>Growth</Text>
                        <Text style={{ color: isPositiveGrowth ? '#81C784' : '#FFB74D', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{growthText}</Text>
                      </View>
                    </View>
                  </View>

                  {/* List of Trip Earnings & Statuses */}
                  <Text style={[{ fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 }, getTextStyle()]}>
                    Filtered Trip Earnings ({filteredEarningsTrips.length} Completed Rides)
                  </Text>

                  {filteredEarningsTrips.length === 0 ? (
                    <View style={{ backgroundColor: theme.cardBackground, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 20 }}>
                      <Text style={[{ fontSize: 13, color: theme.textSecondary }, getTextStyle()]}>No completed trips found for the selected date filter.</Text>
                    </View>
                  ) : (
                    filteredEarningsTrips.map((trip, idx) => (
                      <View key={trip.id} style={{ backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: idx === filteredEarningsTrips.length - 1 ? 20 : 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={[{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>{trip.route}</Text>
                          <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '800' }}>Successfully Completed</Text>
                          </View>
                        </View>
                        <Text style={[{ fontSize: 13, fontWeight: '800', color: '#2E7D32', marginTop: 2 }, getTextStyle()]}>
                          Collected: Rs. {trip.fare.toLocaleString()} (Passenger: {trip.passenger} • {trip.seats} Seat{trip.seats > 1 ? 's' : ''})
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{trip.dateStr}</Text>
                      </View>
                    ))
                  )}
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modern 4-Item Bottom Navigation Bar (Swapped Profile with Settings, Floating plus removed per instructions) */}
      <View style={{
        flexDirection: 'row',
        height: 60,
        backgroundColor: theme.cardBackground,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
      }}>
        {/* 1. Home Tab */}
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setMainNavTab('dashboard')}
        >
          <Icon name="home-variant" size={24} color={mainNavTab === 'dashboard' ? '#2E7D32' : '#9CA3AF'} />
          <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: mainNavTab === 'dashboard' ? '#2E7D32' : '#9CA3AF' }}>Home</Text>
        </TouchableOpacity>

        {/* 2. Bookings Tab */}
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setMainNavTab('booking')}
        >
          <Icon name="briefcase-outline" size={24} color={mainNavTab === 'booking' ? '#2E7D32' : '#9CA3AF'} />
          <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: mainNavTab === 'booking' ? '#2E7D32' : '#9CA3AF' }}>Bookings</Text>
        </TouchableOpacity>

        {/* 3. Active Now Tab (Replaces Wallet per instructions) */}
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setMainNavTab('home')}
        >
          <Icon name="lightning-bolt" size={24} color={mainNavTab === 'home' ? '#2E7D32' : '#9CA3AF'} />
          <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: mainNavTab === 'home' ? '#2E7D32' : '#9CA3AF' }}>Active Now</Text>
        </TouchableOpacity>

        {/* 4. Settings Tab (Swapped Profile with Settings) */}
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          onPress={onNavigateToSettings}
        >
          <Icon name="cog-outline" size={24} color="#9CA3AF" />
          <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: '#9CA3AF' }}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  roleTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roleTabBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleTabBtnActive: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dashboardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
  },
  dashCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  dashCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  dashText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  dashWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  dashWhatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  countdownCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  centerPillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  greenPill: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 10,
  },
  greenPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noFilterInstructionText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  welcomeGreetingText: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  welcomeSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  trustBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  trustBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  quickActionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginHorizontal: 4,
    // Neumorphic Soft UI Shadow & Elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quickActionPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsTile: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // Neumorphic Soft Tile Elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  analyticsVal: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 4,
  },
  analyticsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  liveTrackerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeVisualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  routePointNode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routePointText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  routeLineBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movingCarIcon: {
    position: 'absolute',
  },
  liveInfoBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  liveTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveTimerText: {
    fontSize: 16,
    fontWeight: '800',
  },
  activeRideActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  activeRideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeRideBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickRoutesCardGrid: {
    flexDirection: 'column',
  },
  quickRouteCardItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickRouteCityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  oneTapPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  oneTapPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  historyItemCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusCompletedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  vehicleInfoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metricTile: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  quickRouteRow: {
    flexDirection: 'column',
    marginTop: 4,
  },
  quickRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  quickRouteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addRouteChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addRouteChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginVertical: 6,
  },
  activeRouteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  sosActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  sosActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bookingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 16,
  },
  bookingActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  bottomNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  bottomNavBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fareCardBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  submitFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  routeBadgeTextBook: {
    color: '#E65100',
    fontWeight: '700',
    fontSize: 13,
  },
  submitFormBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNavText: {
    fontSize: 12,
    marginLeft: 4,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
  },
  pickerSelectorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  pickerIcon: {
    marginRight: 8,
  },
  detailInput: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
    fontSize: 13,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
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
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
    gap: 4,
    zIndex: 99,
    elevation: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 100,
  },
  badgeDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  topSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  topSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  topSegmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  topSegmentText: {
    fontSize: 12,
    marginLeft: 5,
  },
  noFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  noFilterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
    marginTop: 10,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#4B5563',
    marginBottom: 6,
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 38,
  },
  filterValueText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#111827',
  },
  filterPlaceholder: {
    fontSize: 12,
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
  viewScopeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 3,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  scopeBtnTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  myPostBadge: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  myPostBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 8,
    marginRight: 6,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 8,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  activeSectionBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  activeSectionBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modalActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  neumorphicPostCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
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
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    height: 40,
    fontSize: 13,
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
