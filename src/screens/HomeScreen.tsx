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
import ThemedAlertModal, { ThemedAlertProps } from '../components/ThemedAlertModal';
import MapLocationPickerModal from '../components/MapLocationPickerModal';
import InAppChatModal from '../components/InAppChatModal';
import { showThemedAlert } from '../context/AlertContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, OfferRidePost, BookRidePost, BookingRequest } from '../types';
import { LatLng } from '../services/osmService';
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
import { getNotificationsLocal, addNotificationLocal, checkAndNotifyMatchingPost } from '../services/notificationService';
import { calculateTrustScore } from '../services/trustScoreService';
import {
  getDynamicFareForTrip,
  getFareFormulaConfig,
  calculatePassengerFare,
  PassengerFareBreakdown,
} from '../services/fareCalculationService';
import { calculateDynamicRouteDistance } from '../services/osmService';

interface HomeScreenProps {
  userProfile: UserProfile;
  initialTab?: 'dashboard' | 'home' | 'booking';
  initialRole?: 'passenger' | 'driver';
  onNavigateToCreateRide: (fromCity?: string, toCity?: string) => void;
  onNavigateToVehicleConfig: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToTripViewer?: (trip: any) => void;
  onSignOut: () => void;
  onToggleProfileMode?: (newMode: 'passenger' | 'driver') => void;
}

export default function HomeScreen({
  userProfile,
  initialTab,
  initialRole,
  onNavigateToCreateRide,
  onNavigateToVehicleConfig,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToNotifications,
  onNavigateToTripViewer,
  onSignOut,
  onToggleProfileMode,
}: HomeScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { t, isUrdu, getTextStyle } = useLanguage();

  // Top Navigation Tabs: 'dashboard' (Left) | 'home' (Middle) | 'booking' (Right)
  const [mainNavTab, setMainNavTab] = useState<'dashboard' | 'home' | 'booking'>(initialTab || 'dashboard');
  // Sub Role Tab: 'passenger' | 'driver' - initial state synced with user active profile
  const [subRoleTab, setSubRoleTab] = useState<'passenger' | 'driver'>(initialRole || userProfile?.activeProfile || 'passenger');

  useEffect(() => {
    if (userProfile?.activeProfile) {
      setSubRoleTab(userProfile.activeProfile);
    }
  }, [userProfile?.activeProfile]);

  const handleSubRoleChange = (role: 'passenger' | 'driver') => {
    setSubRoleTab(role);
    if (onToggleProfileMode) {
      onToggleProfileMode(role);
    }
  };

  // Dynamic Cities from Google Sheet
  const [sheetCities, setSheetCities] = useState<string[]>([]);

  // Driver Registration check helper
  const hasVehicleProfile = !!(userProfile?.driverProfile?.isLicenseVerified || userProfile?.vehicleDetails || userProfile?.verification?.drivingLicenseNumber);

  // Destination Filters for Booking Screen
  const [filterFromCity, setFilterFromCity] = useState('');
  const [filterToCity, setFilterToCity] = useState('');
  const [showFilterFromPicker, setShowFilterFromPicker] = useState(false);
  const [showFilterToPicker, setShowFilterToPicker] = useState(false);

  // Data lists
  const [offerPosts, setOfferPosts] = useState<OfferRidePost[]>([]);
  const [bookPosts, setBookPosts] = useState<BookRidePost[]>([]);

  // Modals & Forms
  const [showBookFormModal, setShowBookFormModal] = useState(false);
  const [showBookFromPicker, setShowBookFromPicker] = useState(false);
  const [showBookToPicker, setShowBookToPicker] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showPersonaSwitchModal, setShowPersonaSwitchModal] = useState(false);

  // In-App Chat Modal State
  const [chatTarget, setChatTarget] = useState<{
    recipientUid: string;
    recipientName: string;
    relatedPostId?: string;
    tripRoute?: string;
  } | null>(null);

  // Themed Alert Modal State
  const [alertConfig, setAlertConfig] = useState<ThemedAlertProps>({
    visible: false,
    title: '',
  });

  const showAlert = (config: Omit<ThemedAlertProps, 'visible'>) => {
    setAlertConfig({
      ...config,
      visible: true,
      onClose: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
  };

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
      showAlert({
        title: 'Validation Error',
        message: 'Please select both From and To cities.',
        type: 'warning',
      });
      return;
    }
    if (newRouteFrom === newRouteTo) {
      showAlert({
        title: 'Validation Error',
        message: 'From and To cities cannot be the same.',
        type: 'warning',
      });
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
    showAlert({
      title: 'Success',
      message: `Saved route added to your ${subRoleTab === 'passenger' ? 'Passenger' : 'Driver'} quick routes!`,
      type: 'success',
      iconName: 'routes',
    });
  };

  // Book Ride Form State
  const [bookFrom, setBookFrom] = useState('');
  const [bookTo, setBookTo] = useState('');
  const [bookFromCoord, setBookFromCoord] = useState<LatLng | undefined>(undefined);
  const [bookToCoord, setBookToCoord] = useState<LatLng | undefined>(undefined);
  const [bagsCount, setBagsCount] = useState('1');
  const [passengersCount, setPassengersCount] = useState('1');
  const [isAC, setIsAC] = useState(true);
  const [departureTime, setDepartureTime] = useState('14:00 to 15:00');
  const [bookFareBreakdown, setBookFareBreakdown] = useState<PassengerFareBreakdown | null>(null);
  const [isCalculatingBookFare, setIsCalculatingBookFare] = useState(false);

  // Recalculate dynamic fare whenever bookFrom, bookTo, coordinates or isAC changes
  useEffect(() => {
    let isCancelled = false;
    if (bookFrom && bookTo) {
      setIsCalculatingBookFare(true);
      (async () => {
        try {
          const distanceKm = await calculateDynamicRouteDistance(
            bookFrom,
            bookTo,
            bookFromCoord,
            bookToCoord
          );
          const config = await getFareFormulaConfig();
          const breakdown = calculatePassengerFare(distanceKm, 'below_1000cc', isAC, 'gt_road', config);
          if (!isCancelled) {
            setBookFareBreakdown(breakdown);
          }
        } catch (e) {
          console.warn('Dynamic fare calculation error:', e);
        } finally {
          if (!isCancelled) {
            setIsCalculatingBookFare(false);
          }
        }
      })();
    } else {
      setBookFareBreakdown(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [bookFrom, bookTo, bookFromCoord, bookToCoord, isAC]);

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
  const [requestedSeatsCount, setRequestedSeatsCount] = useState<number>(1);

  const fetchPosts = useCallback(async () => {
    try {
      if (subRoleTab === 'passenger') {
        // Passenger mode -> View Driver Ride Offers matching passenger requirements
        if (viewScope === 'my_rides') {
          const myPosts = await getMyOfferRidePostsLocal(userProfile.uid);
          setOfferPosts(myPosts);
        } else if (mainNavTab === 'booking') {
          const data = await getOfferRidePostsLocal(filterFromCity, filterToCity);
          setOfferPosts(data);
        } else {
          // In Active Now Tab (mainNavTab === 'home'):
          // Query ALL active driver offers, and match strictly against the PASSENGER's posted seat requests (or saved routes)
          const allDriverOffers = await getOfferRidePostsLocal();
          const myPassengerRequests = await getMyBookRidePostsLocal(userProfile.uid);

          // Helper to normalize city/location strings (e.g. 'Street 132, Islamabad Capital Territory' -> 'islamabad')
          const normalizeLocation = (loc: string) => {
            return loc.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          };

          const isLocationMatch = (locA: string, locB: string) => {
            if (!locA || !locB) return false;
            const a = normalizeLocation(locA);
            const b = normalizeLocation(locB);
            if (a === b) return true;
            // Check if one contains the other or shares key city words
            const wordsA = a.split(/\s+/).filter((w) => w.length > 2);
            const wordsB = b.split(/\s+/).filter((w) => w.length > 2);
            return wordsA.some((w) => b.includes(w)) || wordsB.some((w) => a.includes(w));
          };

          let matchingDriverPosts: OfferRidePost[] = [];

          if (myPassengerRequests.length > 0) {
            // Match driver rides against any active seat request requirements posted by this passenger
            matchingDriverPosts = allDriverOffers.filter((driverOffer) =>
              myPassengerRequests.some((myReq) => {
                const routeMatch =
                  isLocationMatch(driverOffer.fromCity, myReq.fromCity) &&
                  isLocationMatch(driverOffer.toCity, myReq.toCity);

                const dateMatch =
                  !myReq.travelDate ||
                  !driverOffer.travelDate ||
                  driverOffer.travelDate.trim().toLowerCase() === myReq.travelDate.trim().toLowerCase();

                return routeMatch && dateMatch;
              })
            );
            // Fallback: If strict route match produces 0 results, show all active rides so passenger can always find available rides
            if (matchingDriverPosts.length === 0) {
              matchingDriverPosts = allDriverOffers;
            }
          } else if (passengerQuickRoutesList.length > 0) {
            // If no active seat request posted yet, match against passenger's saved quick routes
            matchingDriverPosts = allDriverOffers.filter((driverOffer) =>
              passengerQuickRoutesList.some(
                (r) =>
                  isLocationMatch(r.from, driverOffer.fromCity) &&
                  isLocationMatch(r.to, driverOffer.toCity)
              )
            );
            // Fallback: show all available driver offers if no quick route matched
            if (matchingDriverPosts.length === 0) {
              matchingDriverPosts = allDriverOffers;
            }
          } else {
            matchingDriverPosts = allDriverOffers;
          }

          setOfferPosts(matchingDriverPosts);
        }
      } else {
        // Driver mode -> View Passenger Seat Requests matching driver requirements
        if (viewScope === 'my_rides') {
          const myPosts = await getMyBookRidePostsLocal(userProfile.uid);
          setBookPosts(myPosts);
        } else if (mainNavTab === 'booking') {
          const data = await getBookRidePostsLocal(filterFromCity, filterToCity);
          setBookPosts(data);
        } else {
          // In Active Now Tab (mainNavTab === 'home'):
          // Query ALL active passenger requests, and match against the DRIVER's posted ride offers (or saved routes)
          const allPassengerRequests = await getBookRidePostsLocal();
          const myDriverOffers = await getMyOfferRidePostsLocal(userProfile.uid);

          const normalizeLocation = (loc: string) => {
            return loc.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          };

          const isLocationMatch = (locA: string, locB: string) => {
            if (!locA || !locB) return false;
            const a = normalizeLocation(locA);
            const b = normalizeLocation(locB);
            if (a === b) return true;
            const wordsA = a.split(/\s+/).filter((w) => w.length > 2);
            const wordsB = b.split(/\s+/).filter((w) => w.length > 2);
            return wordsA.some((w) => b.includes(w)) || wordsB.some((w) => a.includes(w));
          };

          let matchingPassengerPosts: BookRidePost[] = [];

          if (myDriverOffers.length > 0) {
            // Match passenger requests against any active ride offer requirements posted by this driver
            matchingPassengerPosts = allPassengerRequests.filter((passengerReq) =>
              myDriverOffers.some((myOffer) => {
                const routeMatch =
                  isLocationMatch(passengerReq.fromCity, myOffer.fromCity) &&
                  isLocationMatch(passengerReq.toCity, myOffer.toCity);

                const dateMatch =
                  !myOffer.travelDate ||
                  !passengerReq.travelDate ||
                  passengerReq.travelDate.trim().toLowerCase() === myOffer.travelDate.trim().toLowerCase();

                return routeMatch && dateMatch;
              })
            );
            // Fallback: If strict route match produces 0 results, show all available passenger requests so driver sees live market
            if (matchingPassengerPosts.length === 0) {
              matchingPassengerPosts = allPassengerRequests;
            }
          } else if (driverQuickRoutesList.length > 0) {
            // If no active ride offer posted yet, match against driver's saved quick routes
            matchingPassengerPosts = allPassengerRequests.filter((passengerReq) =>
              driverQuickRoutesList.some(
                (r) =>
                  isLocationMatch(r.from, passengerReq.fromCity) &&
                  isLocationMatch(r.to, passengerReq.toCity)
              )
            );
            if (matchingPassengerPosts.length === 0) {
              matchingPassengerPosts = allPassengerRequests;
            }
          } else {
            matchingPassengerPosts = allPassengerRequests;
          }

          setBookPosts(matchingPassengerPosts);
        }
      }
    } catch (e) {
      console.warn('Failed to load posts', e);
    }
  }, [mainNavTab, subRoleTab, viewScope, filterFromCity, filterToCity, passengerQuickRoutesList, driverQuickRoutesList, userProfile.uid]);

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

      // Notify drivers operating on this route
      await checkAndNotifyMatchingPost({
        id: newPost.id,
        fromCity: bookFrom,
        toCity: bookTo,
        departureTime,
        postedByRole: 'passenger',
        posterName: userProfile.fullName,
      });

      setShowBookFormModal(false);
      showAlert({
        title: 'Ride Request Posted!',
        message: 'Your ride request has been posted! Matching drivers will be notified.',
        type: 'success',
        iconName: 'check-decagram',
      });
      fetchPosts();
      fetchUnreadNotifications();
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e.message || 'Failed to create request.',
        type: 'error',
      });
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
      showAlert({
        title: 'Offer Updated',
        message: 'Your ride offer has been updated successfully.',
        type: 'success',
      });
      fetchPosts();
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e.message || 'Failed to update post.',
        type: 'error',
      });
    }
  };

  const handleDeleteOffer = (postId: string) => {
    showAlert({
      title: 'Delete Ride Offer',
      message: 'Are you sure you want to delete this ride offer?',
      type: 'warning',
      iconName: 'trash-can-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteOfferRidePostLocal(postId);
            fetchPosts();
          },
        },
      ],
    });
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
      showAlert({
        title: 'Request Updated',
        message: 'Your seat request has been updated successfully.',
        type: 'success',
      });
      fetchPosts();
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e.message || 'Failed to update request.',
        type: 'error',
      });
    }
  };

  const handleDeleteBook = (postId: string) => {
    showAlert({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this seat request?',
      type: 'warning',
      iconName: 'trash-can-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBookRidePostLocal(postId);
            fetchPosts();
          },
        },
      ],
    });
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
      showAlert({
        title: 'WhatsApp Error',
        message: 'WhatsApp is not installed on this device.',
        type: 'warning',
        iconName: 'whatsapp',
      });
    });
  };

  const handleSendBookingRequest = async (post: OfferRidePost, seatsToBook: number = 1) => {
    try {
      const seatsCount = Math.max(1, Math.min(seatsToBook, post.seatsAvailable));
      const newRequest: BookingRequest = {
        id: 'req_' + Date.now(),
        ridePostId: post.id,
        passengerUid: userProfile?.uid || 'guest',
        passengerName: userProfile?.fullName || 'Passenger',
        passengerPhone: userProfile?.phoneNumber || userProfile?.phone || '',
        seatsRequested: seatsCount,
        status: 'accepted',
        createdAt: Date.now(),
      };
      await saveBookingRequestLocal(newRequest);

      // Decrease available seats in local storage for this ride offer
      const postsRaw = await AsyncStorage.getItem('@local_db_offer_ride_posts');
      if (postsRaw) {
        const posts: OfferRidePost[] = JSON.parse(postsRaw);
        const postIndex = posts.findIndex((p) => p.id === post.id);
        if (postIndex !== -1) {
          posts[postIndex].seatsAvailable = Math.max(0, posts[postIndex].seatsAvailable - seatsCount);
          await AsyncStorage.setItem('@local_db_offer_ride_posts', JSON.stringify(posts));
        }
      }

      // Add Notification for the Driver and Passenger
      await addNotificationLocal({
        title: `🎟️ Seat Confirmed: ${post.fromCity} ➔ ${post.toCity}`,
        message: `${userProfile?.fullName || 'Passenger'} successfully booked ${seatsCount} seat(s) on ${post.driverName}'s ride. Total: Rs. ${(post.farePerSeat * seatsCount).toLocaleString()}.`,
        type: 'booking',
        postId: post.id,
        fromCity: post.fromCity,
        toCity: post.toCity,
        role: 'passenger',
      });

      fetchPosts();

      showThemedAlert(
        'Seat Booked Successfully! 🚗',
        `You have confirmed ${seatsCount} seat${seatsCount > 1 ? 's' : ''} (Total: Rs. ${(post.farePerSeat * seatsCount).toLocaleString()}) with ${post.driverName}. Ride status updated.`,
        undefined,
        { type: 'success', iconName: 'check-decagram', autoDismissMs: 4500 }
      );
    } catch (e: any) {
      showThemedAlert('Error', e.message || 'Failed to complete seat booking.', undefined, { type: 'error', iconName: 'shield-alert', autoDismissMs: 4000 });
    }
  };

  const handleOfferSeatToPassenger = async (post: BookRidePost) => {
    try {
      const newRequest: BookingRequest = {
        id: 'offer_req_' + Date.now(),
        ridePostId: post.id,
        passengerUid: post.passengerUid,
        passengerName: post.passengerName,
        passengerPhone: post.passengerPhone,
        seatsRequested: 1,
        status: 'accepted',
        createdAt: Date.now(),
      };
      await saveBookingRequestLocal(newRequest);

      // Decrement passenger request required count or mark completed
      const bookPostsRaw = await AsyncStorage.getItem('@local_db_book_ride_posts');
      if (bookPostsRaw) {
        const bPosts: BookRidePost[] = JSON.parse(bookPostsRaw);
        const bIndex = bPosts.findIndex((p) => p.id === post.id);
        if (bIndex !== -1) {
          bPosts[bIndex].passengersCount = Math.max(0, (bPosts[bIndex].passengersCount || 1) - 1);
          await AsyncStorage.setItem('@local_db_book_ride_posts', JSON.stringify(bPosts));
        }
      }

      // Add Notification
      await addNotificationLocal({
        title: `🚗 Ride Seat Offered: ${post.fromCity} ➔ ${post.toCity}`,
        message: `${userProfile?.fullName || 'Driver'} offered a seat to ${post.passengerName} for ${post.fromCity} to ${post.toCity}.`,
        type: 'offer',
        postId: post.id,
        fromCity: post.fromCity,
        toCity: post.toCity,
        role: 'driver',
      });

      fetchPosts();

      showThemedAlert(
        'Seat Offer Sent! 🤝',
        `You offered a seat to ${post.passengerName} for the route ${post.fromCity} to ${post.toCity}. Status confirmed.`,
        undefined,
        { type: 'success', iconName: 'steering', autoDismissMs: 4500 }
      );
    } catch (e: any) {
      showThemedAlert('Error', e.message || 'Failed to offer seat.', undefined, { type: 'error', iconName: 'shield-alert', autoDismissMs: 4000 });
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
      {/* Top Soft UI Elevated App Bar */}
      <View style={styles.header}>
        {/* Left: User Profile Avatar & Role Tag */}
        <TouchableOpacity
          style={styles.profileHeaderBtn}
          onPress={onNavigateToProfile}
          activeOpacity={0.85}
        >
          <View style={styles.avatarContainer}>
            <Icon
              name={
                userProfile.profilePicture === 'av1' ? 'account-tie' :
                  userProfile.profilePicture === 'av2' ? 'account-cowboy-hat' :
                    userProfile.profilePicture === 'av3' ? 'account-detective' :
                      userProfile.profilePicture === 'av4' ? 'account-graduation-cap' :
                        userProfile.profilePicture === 'av5' ? 'account-child' :
                          'account'
              }
              size={22}
              color="#2F9A3C"
            />
          </View>
          <View style={styles.profileTextWrapper}>
            <Text numberOfLines={1} style={[styles.userNameText, getTextStyle()]}>
              {userProfile.fullName || 'Welcome, Traveler'}
            </Text>
            <View style={styles.roleTagRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {subRoleTab === 'driver' ? 'Driver' : 'Passenger'}
                </Text>
              </View>
              {subRoleTab === 'driver' && (
                <View style={styles.verifiedTag}>
                  <Icon name="check-decagram" size={12} color="#2F9A3C" style={{ marginRight: 2 }} />
                  <Text style={styles.verifiedTagText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Persona Switcher Badge + SOS Button + Notification Icon */}
        <View style={styles.headerRightActions}>
          {/* Persona Switcher Badge (Passenger <-> Driver) */}
          <TouchableOpacity
            style={styles.personaSwitchPill}
            onPress={() => setShowPersonaSwitchModal(true)}
            activeOpacity={0.85}
          >
            <Icon
              name={subRoleTab === 'driver' ? 'steering' : 'account'}
              size={16}
              color="#2F9A3C"
            />
            <Text style={styles.personaSwitchText}>
              {subRoleTab === 'driver' ? 'Driver' : 'Passenger'}
            </Text>
            <Icon name="chevron-down" size={14} color="#262A27" />
          </TouchableOpacity>

          {/* SOS Safety Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#E53935',
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 9999,
              ...Platform.select({
                ios: {
                  shadowColor: '#E53935',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.35,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 3,
                },
              }),
            }}
            onPress={() => setShowEmergencyModal(true)}
            activeOpacity={0.85}
          >
            <Icon name="shield-alert" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>SOS</Text>
          </TouchableOpacity>

          {/* Notifications Icon Button */}
          <TouchableOpacity
            style={styles.notifIconButton}
            onPress={onNavigateToNotifications}
            activeOpacity={0.85}
          >
            <Icon name="bell-outline" size={18} color="#262A27" />
            {unreadCount > 0 && (
              <View style={styles.unreadDotBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* VIEW 1: DASHBOARD / HOME SCREEN */}
      {mainNavTab === 'dashboard' && (
        <ScrollView contentContainerStyle={styles.feedContainer} showsVerticalScrollIndicator={false}>
          {/* Top Integrated Booking / Post Action Card */}
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeaderRow}>
              <View style={styles.bookingTitleRow}>
                <Icon name="routes" size={18} color="#2F9A3C" />
                <Text style={[styles.bookingTitleText, getTextStyle()]}>
                  {subRoleTab === 'driver' ? 'Offer Ride / Post Availability' : 'Find Ride / Post Request'}
                </Text>
              </View>
              {(filterFromCity || filterToCity) && (
                <TouchableOpacity
                  onPress={() => {
                    setFilterFromCity('');
                    setFilterToCity('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clearBtnText, getTextStyle()]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Soft UI Route Filter Inputs */}
            <View style={styles.routeInputRow}>
              <TouchableOpacity
                style={styles.routeInputField}
                onPress={() => setShowFilterFromPicker(true)}
                activeOpacity={0.85}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    filterFromCity ? styles.routeInputText : styles.routeInputPlaceholder,
                    getTextStyle(),
                  ]}
                >
                  {filterFromCity || t('fromCity')}
                </Text>
                <Icon name="chevron-down" size={16} color="#8A908B" />
              </TouchableOpacity>

              <View style={styles.routeArrowCircle}>
                <Icon name="arrow-right" size={14} color="#FFFFFF" />
              </View>

              <TouchableOpacity
                style={styles.routeInputField}
                onPress={() => setShowFilterToPicker(true)}
                activeOpacity={0.85}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    filterToCity ? styles.routeInputText : styles.routeInputPlaceholder,
                    getTextStyle(),
                  ]}
                >
                  {filterToCity || t('toCity')}
                </Text>
                <Icon name="chevron-down" size={16} color="#8A908B" />
              </TouchableOpacity>
            </View>

            {/* Primary Green Post Action Button */}
            <TouchableOpacity
              style={styles.primaryPostBtn}
              onPress={() => {
                if (subRoleTab === 'driver') {
                  onNavigateToCreateRide(filterFromCity, filterToCity);
                } else {
                  handleOpenBookModal();
                }
              }}
              activeOpacity={0.85}
            >
              <Icon name="plus" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.primaryPostBtnText, getTextStyle()]}>
                {subRoleTab === 'driver' ? t('offerRideBtn') : t('postSeatRequestBtn')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Trip Banner - Shown only when passenger books a seat with a driver */}
          {subRoleTab === 'passenger' && isPassengerSeatBooked && (
            <View style={styles.activeTripBanner}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#262A27' }}>Active Trip</Text>
                <View style={styles.liveTagPill}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2F9A3C', marginRight: 6 }} />
                  <Text style={{ color: '#2F9A3C', fontSize: 11, fontWeight: '600' }}>Live</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2F9A3C', marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#262A27' }}>Islamabad (F-8)</Text>
                    <Text style={{ fontSize: 11, color: '#2F9A3C', marginLeft: 'auto', fontWeight: '600' }}>02h : 44m</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8A908B', marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#262A27' }}>Lahore (Thokar)</Text>
                    <Text style={{ fontSize: 11, color: '#8A908B', marginLeft: 'auto' }}>Dep: 02:00 PM</Text>
                  </View>
                </View>

                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' }}
                  style={{ width: 68, height: 44, resizeMode: 'contain' }}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F3F2', borderRadius: 12, padding: 8, marginTop: 12 }}>
                <Icon name="car" size={16} color="#2F9A3C" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#262A27', fontWeight: '600' }}>Honda City AC • LHR-8822</Text>
              </View>
            </View>
          )}

          {/* Overview Analytics Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, getTextStyle()]}>Overview</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(true)} activeOpacity={0.7}>
              <Text style={[styles.sectionActionText, getTextStyle()]}>View details</Text>
            </TouchableOpacity>
          </View>

          {subRoleTab === 'passenger' ? (
            /* Passenger Mode: 2 Soft UI Elevated Tiles */
            <View style={styles.statsTilesRow}>
              {/* Tile 1: Trips Completed */}
              <View style={styles.statTile}>
                <View style={styles.statIconBadge}>
                  <Icon name="car-multiple" size={18} color="#2F9A3C" />
                </View>
                <Text style={styles.statValue}>14</Text>
                <Text numberOfLines={1} style={[styles.statLabel, getTextStyle()]}>Trips Completed</Text>
                <Text numberOfLines={1} style={styles.statSubText}>+12% this month</Text>
              </View>

              {/* Tile 2: Safety & Trust Score */}
              <View style={styles.statTile}>
                <View style={styles.statIconBadge}>
                  <Icon name="shield-check" size={18} color="#2F9A3C" />
                </View>
                <Text style={styles.statValue}>99%</Text>
                <Text numberOfLines={1} style={[styles.statLabel, getTextStyle()]}>Trust Score</Text>
                <Text numberOfLines={1} style={styles.statSubText}>Verified Traveler</Text>
              </View>
            </View>
          ) : (
            /* Driver Mode: 3 Soft UI Elevated Tiles */
            <View style={styles.statsTilesRow}>
              {/* Tile 1: Driver Earnings */}
              <TouchableOpacity
                style={styles.statTile3}
                onPress={() => setShowEarningsModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.statIconBadge}>
                  <Icon name="cash-multiple" size={18} color="#2F9A3C" />
                </View>
                <Text numberOfLines={1} style={styles.statValue}>Rs 23k</Text>
                <Text numberOfLines={1} style={[styles.statLabel, getTextStyle()]}>Earnings</Text>
                <Text numberOfLines={1} style={styles.statSubText}>Tap for log</Text>
              </TouchableOpacity>

              {/* Tile 2: Trips Completed */}
              <View style={styles.statTile3}>
                <View style={styles.statIconBadge}>
                  <Icon name="car-multiple" size={18} color="#2F9A3C" />
                </View>
                <Text style={styles.statValue}>14</Text>
                <Text numberOfLines={1} style={[styles.statLabel, getTextStyle()]}>Trips</Text>
                <Text numberOfLines={1} style={styles.statSubText}>+12% month</Text>
              </View>

              {/* Tile 3: Driver Trust Score */}
              <TouchableOpacity
                style={styles.statTile3}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.statIconBadge}>
                  <Icon name="shield-check" size={18} color="#2F9A3C" />
                </View>
                <Text style={styles.statValue}>99%</Text>
                <Text numberOfLines={1} style={[styles.statLabel, getTextStyle()]}>Trust</Text>
                <Text numberOfLines={1} style={styles.statSubText}>⭐ 4.9 (32)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Saved Routes Hub (Role specific: Passenger vs Driver) */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E3E7E3',
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
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[{ fontSize: 14, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                Quick Saved Routes
              </Text>
              <TouchableOpacity onPress={() => setShowAddRouteModal(true)} activeOpacity={0.8}>
                <Text style={[{ fontSize: 12, color: '#2F9A3C', fontWeight: '600' }, getTextStyle()]}>Add New</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickRoutesCardGrid}>
              {(subRoleTab === 'passenger' ? passengerQuickRoutesList : driverQuickRoutesList).map((routeItem) => (
                <TouchableOpacity
                  key={routeItem.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E3E7E3',
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => handleSelectQuickRoute(routeItem.from, routeItem.to)}
                  activeOpacity={0.8}
                >
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                    {routeItem.from} ➔ {routeItem.to}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Trip History Feed (Role specific: Passenger vs Driver) */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: '#E3E7E3',
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
          }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={[{ fontSize: 14, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                Recent Completed Trip
              </Text>
            </View>

            {subRoleTab === 'passenger' ? (
              /* Recent Completed Trip for PASSENGER - Click to view on OSM Live Map */
              <TouchableOpacity
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => {
                  if (onNavigateToTripViewer) {
                    onNavigateToTripViewer({
                      id: 'trip_isb_mul_1',
                      driverName: 'Usman Khan',
                      driverPhone: '03449793574',
                      originAddress: 'Islamabad, Zero Point',
                      destinationAddress: 'Multan, Cantt Chowk',
                      originLat: 33.6844,
                      originLng: 73.0479,
                      destinationLat: 30.1575,
                      destinationLng: 71.5249,
                      seats: 3,
                      price: 'Rs. 2,200',
                      timestamp: Date.now() - 3600000 * 24 * 40,
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
                  style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Islamabad ➔ Multan</Text>
                    <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>🗺️ View Map</Text>
                    </View>
                  </View>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Driver: Usman Khan • Fare: Rs. 2,200</Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>22 Jul 2026 • 01:30 PM (Tap to view route)</Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* Recent Completed Trip for DRIVER - Click to view on OSM Live Map */
              <TouchableOpacity
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => {
                  if (onNavigateToTripViewer) {
                    onNavigateToTripViewer({
                      id: 'trip_lhe_isb_1',
                      driverName: userProfile?.fullName || 'Faisal Hayat',
                      driverPhone: userProfile?.phone || '03449793574',
                      originAddress: 'Lahore, Thokar Niaz Baig',
                      destinationAddress: 'Islamabad, Faizabad',
                      originLat: 31.5204,
                      originLng: 74.3587,
                      destinationLat: 33.6844,
                      destinationLng: 73.0479,
                      seats: 4,
                      price: 'Rs. 1,800',
                      timestamp: Date.now() - 3600000 * 24 * 44,
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }}
                  style={{ width: 42, height: 42, borderRadius: 21, marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>Lahore ➔ Islamabad</Text>
                    <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: '800' }}>🗺️ View Map</Text>
                    </View>
                  </View>
                  <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>Passenger: Ali Raza • Fare Collected: Rs. 1,800</Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>18 Jul 2026 • 09:00 AM (Tap to view route)</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* VIEW 2: ACTIVE NOW LIVE FEED SCREEN (MIDDLE TAB) */}
      {mainNavTab === 'home' && (
        <ScrollView contentContainerStyle={styles.feedContainer} showsVerticalScrollIndicator={false}>
          {/* Unverified User Prompt */}
          {!(userProfile?.isVerified || (userProfile?.verification?.isCNICVerified && userProfile?.verification?.phoneVerified !== false)) && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E3E7E3',
              marginBottom: 16,
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
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: 'rgba(47, 154, 60, 0.10)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Icon name="shield-check" size={20} color="#2F9A3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                  Account Verification Required
                </Text>
                <Text style={[{ fontSize: 11, color: '#8A908B', marginTop: 2 }, getTextStyle()]}>
                  Verify your account in Profile to unlock full live rides and seat booking features.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2F9A3C',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                  onPress={onNavigateToProfile}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Verify Account Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Posts Live Feed Cards */}
          <View>
            {subRoleTab === 'passenger' ? (
              offerPosts.length === 0 ? (
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
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
                }}>
                  <Icon name="car-off" size={40} color="#8A908B" />
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: '#262A27', marginTop: 8 }, getTextStyle()]}>
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
                      onPress={() => {
                        setRequestedSeatsCount(1);
                        setSelectedRideDetail(post);
                      }}
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
                      <View style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <Text style={[{ fontSize: 14, fontWeight: '800', color: '#1B3E1E', flex: 1, marginRight: 8 }, getTextStyle()]}>
                            {post.fromCity} ➔ {post.toCity}
                          </Text>
                          <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#2E7D32' }}>
                              Rs. {post.farePerSeat.toLocaleString()} <Text style={{ fontSize: 10, fontWeight: '600' }}>/ seat</Text>
                            </Text>
                          </View>
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
                          onPress={() => {
                            setRequestedSeatsCount(1);
                            setSelectedRideDetail(post);
                          }}
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
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
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
                }}>
                  <Icon name="account-search" size={40} color="#8A908B" />
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: '#262A27', marginTop: 8 }, getTextStyle()]}>
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





      {/* Full Screen Book Ride / Seat Request Form Modal (Mockup Image 5) */}
      <Modal visible={showBookFormModal} animationType="slide" transparent={false} onRequestClose={() => setShowBookFormModal(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F2F3F2' }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
          {/* Header */}
          <View style={{
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
          }}>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E3E7E3',
              }}
              onPress={() => setShowBookFormModal(false)}
              activeOpacity={0.8}
            >
              <Icon name="arrow-left" size={20} color="#262A27" />
            </TouchableOpacity>
            <Text style={[{ fontSize: 18, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
              {t('postSeatRequestBtn')}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Route & Locations Card */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E3E7E3',
              marginBottom: 16,
            }}>
              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#2F9A3C', marginBottom: 10, letterSpacing: 0.5 }, getTextStyle()]}>ROUTE & LOCATIONS</Text>

              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#262A27', marginBottom: 6 }, getTextStyle()]}>{t('fromCity')}</Text>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
                onPress={() => setShowBookFromPicker(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Icon name="map-marker" size={18} color="#2F9A3C" style={{ marginRight: 8 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '500', color: bookFrom ? '#262A27' : '#8A908B' }, getTextStyle()]}>
                    {bookFrom || t('selectDepartureCity')}
                  </Text>
                </View>
                <Icon name="chevron-down" size={18} color="#8A908B" />
              </TouchableOpacity>

              <TextInput
                style={[{
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#262A27',
                  marginBottom: 14,
                }, getTextStyle()]}
                placeholder="Landmark/Pickup details (e.g. Metro Pole, Gate 3)"
                placeholderTextColor="#8A908B"
              />

              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#262A27', marginBottom: 6 }, getTextStyle()]}>{t('toCity')}</Text>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
                onPress={() => setShowBookToPicker(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Icon name="map-marker" size={18} color="#2F9A3C" style={{ marginRight: 8 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '500', color: bookTo ? '#262A27' : '#8A908B' }, getTextStyle()]}>
                    {bookTo || t('selectDestinationCity')}
                  </Text>
                </View>
                <Icon name="chevron-down" size={18} color="#8A908B" />
              </TouchableOpacity>

              <TextInput
                style={[{
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#262A27',
                  marginBottom: 14,
                }, getTextStyle()]}
                placeholder="Dropoff details (e.g. Block 5, next to mall)"
                placeholderTextColor="#8A908B"
              />

              {/* Air Conditioning Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>Air Conditioning (AC)</Text>
                  <Text style={[{ fontSize: 11, color: '#8A908B', marginTop: 2 }, getTextStyle()]}>Enable AC premium tier pricing</Text>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isAC ? 'rgba(47, 154, 60, 0.12)' : '#F2F3F2',
                    borderWidth: 1.5,
                    borderColor: isAC ? '#2F9A3C' : '#D1D5D1',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 14,
                  }}
                  onPress={() => setIsAC((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Icon name={isAC ? 'snowflake' : 'fan'} size={16} color={isAC ? '#2F9A3C' : '#8A908B'} />
                  <Text style={{ marginLeft: 6, fontWeight: '700', fontSize: 13, color: isAC ? '#2F9A3C' : '#8A908B' }}>
                    {isAC ? 'AC Premium' : 'Non-AC'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#262A27', marginTop: 8, marginBottom: 6 }, getTextStyle()]}>Number of Passengers *</Text>
              <TextInput
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#262A27',
                  marginBottom: 10,
                }}
                keyboardType="numeric"
                value={passengersCount}
                onChangeText={setPassengersCount}
              />

              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#262A27', marginBottom: 6 }, getTextStyle()]}>Number of Bags</Text>
              <TextInput
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#262A27',
                  marginBottom: 10,
                }}
                keyboardType="numeric"
                value={bagsCount}
                onChangeText={setBagsCount}
              />

              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#262A27', marginBottom: 6 }, getTextStyle()]}>{t('departureTime')}</Text>
              <TextInput
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#262A27',
                }}
                value={departureTime}
                onChangeText={setDepartureTime}
              />

              {/* Dynamic Distance-based Fare Summary */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 16,
                marginTop: 14,
                borderWidth: 1,
                borderColor: '#E3E7E3',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[{ fontSize: 11, fontWeight: '700', color: '#2F9A3C', letterSpacing: 0.5 }, getTextStyle()]}>
                    FARE SUMMARY (LIVE FORMULA)
                  </Text>
                  {bookFareBreakdown && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2F9A3C' }}>
                      🛣️ {bookFareBreakdown.distanceKm} KM
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[{ fontSize: 13, color: '#8A908B' }, getTextStyle()]}>Tier Option:</Text>
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                    {isAC ? 'AC Premium' : 'Non-AC Standard'}
                  </Text>
                </View>
                {bookFareBreakdown && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[{ fontSize: 13, color: '#8A908B' }, getTextStyle()]}>Fuel Rate:</Text>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                      Rs. {bookFareBreakdown.fuelPricePerLiter} / L
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[{ fontSize: 13, color: '#8A908B' }, getTextStyle()]}>Fare rate per seat:</Text>
                  <Text style={[{ fontSize: 14, fontWeight: '700', color: '#262A27' }]}>
                    {isCalculatingBookFare
                      ? 'Calculating...'
                      : bookFareBreakdown
                        ? `Rs. ${bookFareBreakdown.perHeadFixedFare.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : 'Rs. 0.00'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: '#F2F3F2' }}>
                  <Text style={[{ fontSize: 14, fontWeight: '700', color: '#2F9A3C' }, getTextStyle()]}>
                    Total Est. Fare ({parseInt(passengersCount, 10) || 1} Seat{(parseInt(passengersCount, 10) || 1) > 1 ? 's' : ''}):
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#2F9A3C' }}>
                    {isCalculatingBookFare
                      ? 'Calculating...'
                      : bookFareBreakdown
                        ? `Rs. ${(bookFareBreakdown.perHeadFixedFare * (parseInt(passengersCount, 10) || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : 'Rs. 0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button at Bottom */}
            <TouchableOpacity
              style={{
                backgroundColor: '#2F9A3C',
                height: 52,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 16,
                marginBottom: 32,
                ...Platform.select({
                  ios: {
                    shadowColor: '#2F9A3C',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.28,
                    shadowRadius: 12,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              }}
              onPress={handleCreatePassengerRequest}
              activeOpacity={0.85}
            >
              <Text style={[{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }, getTextStyle()]}>
                {t('submitPassengerRequest')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Dedicated Map Location Picker for Booking Modal Origin */}
          <MapLocationPickerModal
            visible={showBookFromPicker}
            title="Select Pickup Location on Map"
            type="from"
            initialCityName={bookFrom || userProfile?.city || 'Islamabad'}
            onSelectLocation={(locName, coords) => {
              setBookFrom(locName);
              setBookFromCoord(coords);
              setShowBookFromPicker(false);
            }}
            onClose={() => setShowBookFromPicker(false)}
          />

          {/* Dedicated Map Location Picker for Booking Modal Destination */}
          <MapLocationPickerModal
            visible={showBookToPicker}
            title="Select Destination on Map"
            type="to"
            initialCityName={bookTo || 'Rawalpindi'}
            onSelectLocation={(locName, coords) => {
              setBookTo(locName);
              setBookToCoord(coords);
              setShowBookToPicker(false);
            }}
            onClose={() => setShowBookToPicker(false)}
          />
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

      {/* Interactive Map Location Picker for Home Screen Feed Filters */}
      <MapLocationPickerModal
        visible={showFilterFromPicker}
        title="Select Filter Departure City"
        type="from"
        initialCityName={filterFromCity || userProfile?.city || 'Islamabad'}
        onSelectLocation={(locName) => {
          setFilterFromCity(locName);
          setShowFilterFromPicker(false);
        }}
        onClose={() => setShowFilterFromPicker(false)}
      />

      <MapLocationPickerModal
        visible={showFilterToPicker}
        title="Select Filter Destination City"
        type="to"
        initialCityName={filterToCity || 'Rawalpindi'}
        onSelectLocation={(locName) => {
          setFilterToCity(locName);
          setShowFilterToPicker(false);
        }}
        onClose={() => setShowFilterToPicker(false)}
      />

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
      <Modal visible={!!selectedRideDetail} animationType="fade" transparent onRequestClose={() => setSelectedRideDetail(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedRideDetail(null)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, {
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              borderWidth: 1,
              borderColor: '#E8EBE8',
              ...Platform.select({
                ios: {
                  shadowColor: '#1B3E1E',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                },
                android: {
                  elevation: 8,
                },
              }),
            }]}>
              {/* Route Banner Header with Close Button */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1,
                  borderColor: '#DCFCE7',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginRight: 10,
                }}>
                  <Text style={[{ fontSize: 13, fontWeight: '800', color: '#15803D', lineHeight: 18 }, getTextStyle()]}>
                    {selectedRideDetail?.fromCity} ➔ {selectedRideDetail?.toCity}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedRideDetail(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#F3F4F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name="close" size={18} color="#4B5563" />
                </TouchableOpacity>
              </View>

              {/* Driver Identity */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[{ fontSize: 18, fontWeight: '900', color: '#1F2937' }, getTextStyle()]}>
                  Driver: {selectedRideDetail?.driverName}
                </Text>
              </View>

              {/* Badges Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>⭐ 4.9 Rating (32 Reviews)</Text>
                </View>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>99% Trust Score</Text>
                </View>
              </View>

              {/* Vehicle Details */}
              <View style={{ marginBottom: 12, gap: 4 }}>
                <Text style={[{ fontSize: 13, color: '#4B5563', fontWeight: '500' }, getTextStyle()]}>
                  Vehicle: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{selectedRideDetail?.vehicleDetails}</Text>
                </Text>

                <Text style={[{ fontSize: 11, color: '#D97706', fontWeight: '700' }, getTextStyle()]}>
                  🔒 Vehicle Registration No: Revealed after driver accepts booking
                </Text>

                <Text style={[{ fontSize: 13, color: '#4B5563', fontWeight: '500' }, getTextStyle()]}>
                  Departure Window: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{selectedRideDetail?.departureTime}</Text>
                </Text>
              </View>

              {/* Fare & Seat Summary Box */}
              <View style={{
                backgroundColor: '#F8FAF9',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
              }}>
                {/* Seats Available Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#374151' }, getTextStyle()]}>Seats Available:</Text>
                  <Text style={[{ fontSize: 14, fontWeight: '800', color: (selectedRideDetail?.seatsAvailable || 0) > 0 ? '#16A34A' : '#DC2626' }]}>
                    {selectedRideDetail?.seatsAvailable} Seat{(selectedRideDetail?.seatsAvailable || 0) > 1 ? 's' : ''} Left
                  </Text>
                </View>

                {/* Seat Selector Stepper for Passenger */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#1F2937' }, getTextStyle()]}>Book Seats:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: requestedSeatsCount > 1 ? '#FFFFFF' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: requestedSeatsCount > 1 ? '#2F9A3C' : '#D1D5DB',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      disabled={requestedSeatsCount <= 1}
                      onPress={() => setRequestedSeatsCount((prev) => Math.max(1, prev - 1))}
                      activeOpacity={0.8}
                    >
                      <Icon name="minus" size={16} color={requestedSeatsCount > 1 ? '#2F9A3C' : '#9CA3AF'} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#111827', minWidth: 20, textAlign: 'center' }}>
                      {requestedSeatsCount}
                    </Text>
                    <TouchableOpacity
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: requestedSeatsCount < (selectedRideDetail?.seatsAvailable || 1) ? '#2F9A3C' : '#E5E7EB',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      disabled={requestedSeatsCount >= (selectedRideDetail?.seatsAvailable || 1)}
                      onPress={() => setRequestedSeatsCount((prev) => Math.min(selectedRideDetail?.seatsAvailable || 1, prev + 1))}
                      activeOpacity={0.8}
                    >
                      <Icon name="plus" size={16} color={requestedSeatsCount < (selectedRideDetail?.seatsAvailable || 1) ? '#FFFFFF' : '#9CA3AF'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Single Seat Rate */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                  <Text style={[{ fontSize: 12, color: '#6B7280', fontWeight: '500' }, getTextStyle()]}>Rate per seat:</Text>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#374151' }]}>Rs. {selectedRideDetail?.farePerSeat.toLocaleString()} / seat</Text>
                </View>

                {/* Total Multiplied Fare */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderColor: '#F3F4F6' }}>
                  <Text style={[{ fontSize: 14, fontWeight: '800', color: '#15803D' }, getTextStyle()]}>
                    Total Fare ({requestedSeatsCount} Seat{requestedSeatsCount > 1 ? 's' : ''}):
                  </Text>
                  <Text style={[{ fontSize: 20, fontWeight: '900', color: '#15803D' }]}>
                    Rs. {((selectedRideDetail?.farePerSeat || 0) * requestedSeatsCount).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: WhatsApp, Call, Send Booking Request */}
              {/* Action Buttons: WhatsApp, Call, In-App Message, Book Seat */}
              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: '#2F9A3C',
                  marginBottom: 8,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#2F9A3C',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
                onPress={() => {
                  const driverPhone = selectedRideDetail?.driverPhone || '03449793574';
                  const totalAmt = (selectedRideDetail?.farePerSeat || 0) * requestedSeatsCount;
                  const message = `Hi ${selectedRideDetail?.driverName || ''}, I would like to book ${requestedSeatsCount} seat(s) for the ride from ${selectedRideDetail?.fromCity || ''} to ${selectedRideDetail?.toCity || ''}. Total Fare: Rs. ${totalAmt.toLocaleString()}.`;
                  handleOpenWhatsApp(driverPhone, message);
                }}
                activeOpacity={0.85}
              >
                <Icon name="whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }, getTextStyle()]}>WhatsApp Driver</Text>
              </TouchableOpacity>

              {/* Direct Call & In-App Message Row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  onPress={() => handleTriggerEmergencyCall(selectedRideDetail?.driverPhone || '03449793574')}
                  activeOpacity={0.85}
                >
                  <Icon name="phone" size={18} color="#374151" style={{ marginRight: 6 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#374151' }, getTextStyle()]}>Direct Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                  onPress={() => {
                    if (selectedRideDetail) {
                      const detail = selectedRideDetail;
                      setSelectedRideDetail(null);
                      setChatTarget({
                        recipientUid: detail.driverUid || 'driver_user',
                        recipientName: detail.driverName,
                        relatedPostId: detail.id,
                        tripRoute: `${detail.fromCity} ➔ ${detail.toCity}`,
                      });
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name="chat-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#2563EB' }, getTextStyle()]}>In-App Message</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: (selectedRideDetail?.seatsAvailable || 0) >= requestedSeatsCount ? '#F0FDF4' : '#F3F4F6',
                  borderWidth: 1.5,
                  borderColor: (selectedRideDetail?.seatsAvailable || 0) >= requestedSeatsCount ? '#2F9A3C' : '#D1D5DB',
                }}
                disabled={(selectedRideDetail?.seatsAvailable || 0) < requestedSeatsCount}
                onPress={() => {
                  if (selectedRideDetail) {
                    const postToBook = selectedRideDetail;
                    const seats = requestedSeatsCount;
                    setSelectedRideDetail(null);
                    handleSendBookingRequest(postToBook, seats);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={[{ fontSize: 14, fontWeight: '800', color: (selectedRideDetail?.seatsAvailable || 0) >= requestedSeatsCount ? '#15803D' : '#9CA3AF' }, getTextStyle()]}>
                  {(selectedRideDetail?.seatsAvailable || 0) >= requestedSeatsCount
                    ? `Book ${requestedSeatsCount} Seat${requestedSeatsCount > 1 ? 's' : ''} (Rs. ${((selectedRideDetail?.farePerSeat || 0) * requestedSeatsCount).toLocaleString()})`
                    : 'Not Enough Seats Available'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Active Seat Request Detail View Modal (Clickable Screenshot 2 Card) */}
      <Modal visible={!!selectedSeatDetail} animationType="fade" transparent onRequestClose={() => setSelectedSeatDetail(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSeatDetail(null)}
        >
          <TouchableWithoutFeedback>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              borderWidth: 1,
              borderColor: '#E8EBE8',
              ...Platform.select({
                ios: {
                  shadowColor: '#1B3E1E',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                },
                android: {
                  elevation: 8,
                },
              }),
            }}>
              {/* Route Banner Header with Close Button */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1,
                  borderColor: '#DCFCE7',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginRight: 10,
                }}>
                  <Text style={[{ fontSize: 13, fontWeight: '800', color: '#15803D', lineHeight: 18 }, getTextStyle()]}>
                    {selectedSeatDetail?.fromCity} ➔ {selectedSeatDetail?.toCity}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedSeatDetail(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#F3F4F6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Icon name="close" size={18} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 4 }, getTextStyle()]}>
                Passenger: {selectedSeatDetail?.passengerName}
              </Text>
              <Text style={[{ fontSize: 13, color: '#4B5563', marginBottom: 18, fontWeight: '500' }, getTextStyle()]}>
                Requested Departure Time: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{selectedSeatDetail?.departureTime}</Text>
              </Text>

              {/* Action Buttons for Driver */}
              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: '#2F9A3C',
                  marginBottom: 8,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#2F9A3C',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
                onPress={() => {
                  Linking.openURL(`https://wa.me/923449793574?text=Hi%20${encodeURIComponent(selectedSeatDetail?.passengerName || '')}%2C%20I%20have%20an%20available%20seat%20for%20your%20ride%20to%20${encodeURIComponent(selectedSeatDetail?.toCity || '')}.`);
                }}
                activeOpacity={0.85}
              >
                <Icon name="whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }, getTextStyle()]}>WhatsApp Passenger</Text>
              </TouchableOpacity>

              {/* Direct Call & In-App Message Row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  onPress={() => handleTriggerEmergencyCall('03449793574')}
                  activeOpacity={0.85}
                >
                  <Icon name="phone" size={18} color="#374151" style={{ marginRight: 6 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#374151' }, getTextStyle()]}>Direct Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                  onPress={() => {
                    if (selectedSeatDetail) {
                      const detail = selectedSeatDetail;
                      setSelectedSeatDetail(null);
                      setChatTarget({
                        recipientUid: detail.passengerUid || 'passenger_user',
                        recipientName: detail.passengerName,
                        relatedPostId: detail.id,
                        tripRoute: `${detail.fromCity} ➔ ${detail.toCity}`,
                      });
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name="chat-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#2563EB' }, getTextStyle()]}>In-App Message</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: '#F0FDF4',
                  borderWidth: 1.5,
                  borderColor: '#2F9A3C',
                }}
                onPress={() => {
                  if (selectedSeatDetail) {
                    const post = selectedSeatDetail;
                    setSelectedSeatDetail(null);
                    handleOfferSeatToPassenger(post);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={[{ fontSize: 14, fontWeight: '800', color: '#15803D' }, getTextStyle()]}>Offer a Seat to Passenger</Text>
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



      {/* Quick Profile Persona Switcher Modal (Passenger <-> Driver) */}
      <Modal visible={showPersonaSwitchModal} transparent animationType="fade" onRequestClose={() => setShowPersonaSwitchModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPersonaSwitchModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E3E7E3',
              ...Platform.select({
                ios: {
                  shadowColor: '#262A27',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.16,
                  shadowRadius: 16,
                },
                android: {
                  elevation: 8,
                },
              }),
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(47, 154, 60, 0.10)', justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name="swap-horizontal" size={20} color="#2F9A3C" />
                  </View>
                  <Text style={[{ fontSize: 16, fontWeight: '600', color: '#262A27' }, getTextStyle()]}>
                    Switch Active Profile
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowPersonaSwitchModal(false)} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2F3F2', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="close" size={18} color="#262A27" />
                </TouchableOpacity>
              </View>

              <Text style={[{ fontSize: 12, color: '#8A908B', marginBottom: 16, lineHeight: 17 }, getTextStyle()]}>
                Choose how you want to use Raahi right now. Your dashboard and live feed will immediately adapt.
              </Text>

              {/* 2 Switch Buttons: Driver & Passenger */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {/* 1. Passenger Button */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    borderRadius: 18,
                    backgroundColor: subRoleTab === 'passenger' ? '#2F9A3C' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: subRoleTab === 'passenger' ? '#2F9A3C' : '#E3E7E3',
                    gap: 6,
                    ...Platform.select({
                      ios: {
                        shadowColor: subRoleTab === 'passenger' ? '#2F9A3C' : '#262A27',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: subRoleTab === 'passenger' ? 0.25 : 0.06,
                        shadowRadius: 8,
                      },
                      android: {
                        elevation: 3,
                      },
                    }),
                  }}
                  onPress={() => {
                    handleSubRoleChange('passenger');
                    setShowPersonaSwitchModal(false);
                    showThemedAlert('Profile Switched!', 'You are now in Passenger Mode.', undefined, { type: 'success', iconName: 'check-decagram', autoDismissMs: 4000 });
                  }}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="account"
                    size={24}
                    color={subRoleTab === 'passenger' ? '#FFFFFF' : '#262A27'}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: subRoleTab === 'passenger' ? '#FFFFFF' : '#262A27',
                    }}
                  >
                    Passenger
                  </Text>
                  {subRoleTab === 'passenger' && (
                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#FFFFFF' }}>ACTIVE</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* 2. Driver Button */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    borderRadius: 18,
                    backgroundColor: subRoleTab === 'driver' ? '#2F9A3C' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: subRoleTab === 'driver' ? '#2F9A3C' : '#E3E7E3',
                    gap: 6,
                    ...Platform.select({
                      ios: {
                        shadowColor: subRoleTab === 'driver' ? '#2F9A3C' : '#262A27',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: subRoleTab === 'driver' ? 0.25 : 0.06,
                        shadowRadius: 8,
                      },
                      android: {
                        elevation: 3,
                      },
                    }),
                  }}
                  onPress={() => {
                    handleSubRoleChange('driver');
                    setShowPersonaSwitchModal(false);
                    showThemedAlert('Profile Switched!', 'You are now in Driver Mode.', undefined, { type: 'success', iconName: 'check-decagram', autoDismissMs: 4000 });
                  }}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="steering"
                    size={24}
                    color={subRoleTab === 'driver' ? '#FFFFFF' : '#262A27'}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: subRoleTab === 'driver' ? '#FFFFFF' : '#262A27',
                    }}
                  >
                    Driver
                  </Text>
                  {subRoleTab === 'driver' && (
                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#FFFFFF' }}>ACTIVE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E3E7E3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setShowPersonaSwitchModal(false)}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#262A27' }}>Cancel</Text>
              </TouchableOpacity>
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

      {/* Soft UI Floating Bottom Navigation Bar */}
      <View style={styles.floatingBottomNavContainer}>
        <View style={styles.floatingBottomNav}>
          {/* 1. Home Tab (Integrated Booking & Dashboard) */}
          <TouchableOpacity
            style={[
              styles.floatingNavTab,
              mainNavTab === 'dashboard' ? styles.floatingNavTabActive : null,
            ]}
            onPress={() => setMainNavTab('dashboard')}
            activeOpacity={0.85}
          >
            <Icon
              name="home-variant"
              size={22}
              color={mainNavTab === 'dashboard' ? '#FFFFFF' : '#8A908B'}
            />
            <Text
              style={[
                styles.floatingNavText,
                mainNavTab === 'dashboard' ? styles.floatingNavTextActive : styles.floatingNavTextInactive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* 2. Active Now Tab (Strictly Matching Live Feed) */}
          <TouchableOpacity
            style={[
              styles.floatingNavTab,
              mainNavTab === 'home' ? styles.floatingNavTabActive : null,
            ]}
            onPress={() => setMainNavTab('home')}
            activeOpacity={0.85}
          >
            <Icon
              name="lightning-bolt"
              size={22}
              color={mainNavTab === 'home' ? '#FFFFFF' : '#8A908B'}
            />
            <Text
              style={[
                styles.floatingNavText,
                mainNavTab === 'home' ? styles.floatingNavTextActive : styles.floatingNavTextInactive,
              ]}
            >
              Active Now
            </Text>
          </TouchableOpacity>

          {/* 3. Settings Tab */}
          <TouchableOpacity
            style={styles.floatingNavTab}
            onPress={() => {
              if (onNavigateToSettings) {
                onNavigateToSettings();
              }
            }}
            activeOpacity={0.85}
          >
            <Icon
              name="cog-outline"
              size={22}
              color="#8A908B"
            />
            <Text
              style={[
                styles.floatingNavText,
                styles.floatingNavTextInactive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* In-App Chat Modal */}
      {chatTarget && (
        <InAppChatModal
          visible={!!chatTarget}
          onClose={() => setChatTarget(null)}
          currentUser={userProfile}
          recipientUid={chatTarget.recipientUid}
          recipientName={chatTarget.recipientName}
          relatedPostId={chatTarget.relatedPostId}
          tripRoute={chatTarget.tripRoute}
        />
      )}

      {/* Themed Alert Modal for Soft UI consistency */}
      <ThemedAlertModal {...alertConfig} />
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
  profileHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileTextWrapper: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#2F9A3C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  personaSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262A27',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  notifIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDotBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2F9A3C',
  },
  feedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 110,
  },
  bookingCard: {
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
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A908B',
  },
  routeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInputField: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  routeInputText: {
    fontSize: 14,
    color: '#262A27',
    fontWeight: '600',
    flex: 1,
  },
  routeInputPlaceholder: {
    fontSize: 13,
    color: '#8A908B',
    flex: 1,
  },
  routeArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2F9A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  primaryPostBtn: {
    backgroundColor: '#2F9A3C',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  activeTripBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2F9A3C',
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
  liveTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
  },
  sectionActionText: {
    fontSize: 13,
    color: '#2F9A3C',
    fontWeight: '600',
  },
  statsTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
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
  statTile3: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
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
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262A27',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 2,
  },
  statSubText: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  floatingBottomNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 16 : 28,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99,
  },
  floatingBottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 72,
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingNavTab: {
    flex: 1,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingNavTabActive: {
    backgroundColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  floatingNavText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  floatingNavTextActive: {
    color: '#FFFFFF',
  },
  floatingNavTextInactive: {
    color: '#8A908B',
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
    height: 40,
    borderRadius: 10,
  },
  bookingActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
