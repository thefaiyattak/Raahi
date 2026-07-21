import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, OfferRidePost, BookRidePost, BookingRequest } from '../types';

const KEYS = {
  FIREBASE_USER_PROFILES: '@firebase_remote_user_profiles',
  LOCAL_OFFER_RIDE_POSTS: '@local_db_offer_ride_posts',
  LOCAL_BOOK_RIDE_POSTS: '@local_db_book_ride_posts',
  LOCAL_BOOKING_REQUESTS: '@local_db_booking_requests',
};

// ==========================================
// 1. FIREBASE SIMULATED / REMOTE PROFILE STORAGE
// ==========================================

export const saveProfileToFirebase = async (profile: UserProfile): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FIREBASE_USER_PROFILES);
    const profiles: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
    profiles[profile.uid] = profile;
    await AsyncStorage.setItem(KEYS.FIREBASE_USER_PROFILES, JSON.stringify(profiles));
  } catch (error: any) {
    console.error('[FirebaseStorage] Error saving profile:', error);
    throw new Error('Failed to sync user profile with Firebase cloud.');
  }
};

export const getProfileFromFirebase = async (uid: string): Promise<UserProfile | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FIREBASE_USER_PROFILES);
    if (!raw) return null;
    const profiles: Record<string, UserProfile> = JSON.parse(raw);
    return profiles[uid] || null;
  } catch (error: any) {
    console.error('[FirebaseStorage] Error fetching profile:', error);
    return null;
  }
};

// ==========================================
// 2. LOCAL DB FOR RIDE POSTS & REQUESTS (AsyncStorage DB)
// ==========================================

// --- Helper: Clean up posts older than 30 minutes after departure time ---
const isPostActive = (departureTimestamp: number): boolean => {
  const THIRTY_MINS_MS = 30 * 60 * 1000;
  const expirationTime = departureTimestamp + THIRTY_MINS_MS;
  return Date.now() <= expirationTime;
};

// --- Offer Ride Posts (Driver) ---
export const saveOfferRidePostLocal = async (post: OfferRidePost): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  let posts: OfferRidePost[] = raw ? JSON.parse(raw) : [];
  posts = posts.filter((p) => isPostActive(p.departureTimestamp));
  posts.unshift(post);
  await AsyncStorage.setItem(KEYS.LOCAL_OFFER_RIDE_POSTS, JSON.stringify(posts));
};

export const getOfferRidePostsLocal = async (fromCity?: string, toCity?: string): Promise<OfferRidePost[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  if (!raw) return [];
  let posts: OfferRidePost[] = JSON.parse(raw);
  posts = posts.filter((p) => isPostActive(p.departureTimestamp));

  if (fromCity && fromCity.trim().length > 0) {
    posts = posts.filter((p) => p.fromCity.toLowerCase() === fromCity.trim().toLowerCase());
  }
  if (toCity && toCity.trim().length > 0) {
    posts = posts.filter((p) => p.toCity.toLowerCase() === toCity.trim().toLowerCase());
  }
  return posts;
};

// --- Book Ride Posts (Passenger) ---
export const saveBookRidePostLocal = async (post: BookRidePost): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOK_RIDE_POSTS);
  let posts: BookRidePost[] = raw ? JSON.parse(raw) : [];
  posts = posts.filter((p) => isPostActive(p.departureTimestamp));
  posts.unshift(post);
  await AsyncStorage.setItem(KEYS.LOCAL_BOOK_RIDE_POSTS, JSON.stringify(posts));
};

export const getBookRidePostsLocal = async (fromCity?: string, toCity?: string): Promise<BookRidePost[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOK_RIDE_POSTS);
  if (!raw) return [];
  let posts: BookRidePost[] = JSON.parse(raw);
  posts = posts.filter((p) => isPostActive(p.departureTimestamp));

  if (fromCity && fromCity.trim().length > 0) {
    posts = posts.filter((p) => p.fromCity.toLowerCase() === fromCity.trim().toLowerCase());
  }
  if (toCity && toCity.trim().length > 0) {
    posts = posts.filter((p) => p.toCity.toLowerCase() === toCity.trim().toLowerCase());
  }
  return posts;
};

// --- Booking Requests ---
export const saveBookingRequestLocal = async (request: BookingRequest): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOKING_REQUESTS);
  const requests: BookingRequest[] = raw ? JSON.parse(raw) : [];
  requests.unshift(request);
  await AsyncStorage.setItem(KEYS.LOCAL_BOOKING_REQUESTS, JSON.stringify(requests));
};

export const getBookingRequestsLocal = async (ridePostId: string): Promise<BookingRequest[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOKING_REQUESTS);
  if (!raw) return [];
  const requests: BookingRequest[] = JSON.parse(raw);
  return requests.filter((r) => r.ridePostId === ridePostId);
};

export const updateBookingRequestStatusLocal = async (
  requestId: string,
  status: 'accepted' | 'rejected'
): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOKING_REQUESTS);
  if (!raw) return;
  const requests: BookingRequest[] = JSON.parse(raw);
  const index = requests.findIndex((r) => r.id === requestId);
  if (index !== -1) {
    requests[index].status = status;
    await AsyncStorage.setItem(KEYS.LOCAL_BOOKING_REQUESTS, JSON.stringify(requests));

    // If accepted, update available seats in OfferRidePost
    if (status === 'accepted') {
      const ridePostId = requests[index].ridePostId;
      const seatsRequested = requests[index].seatsRequested;
      const postsRaw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
      if (postsRaw) {
        const posts: OfferRidePost[] = JSON.parse(postsRaw);
        const postIndex = posts.findIndex((p) => p.id === ridePostId);
        if (postIndex !== -1) {
          posts[postIndex].seatsAvailable = Math.max(0, posts[postIndex].seatsAvailable - seatsRequested);
          await AsyncStorage.setItem(KEYS.LOCAL_OFFER_RIDE_POSTS, JSON.stringify(posts));
        }
      }
    }
  }
};
