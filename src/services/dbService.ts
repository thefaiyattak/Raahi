import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, OfferRidePost, BookRidePost, BookingRequest, ChatMessage } from '../types';

const KEYS = {
  FIREBASE_USER_PROFILES: '@firebase_remote_user_profiles',
  LOCAL_OFFER_RIDE_POSTS: '@local_db_offer_ride_posts',
  LOCAL_BOOK_RIDE_POSTS: '@local_db_book_ride_posts',
  LOCAL_BOOKING_REQUESTS: '@local_db_booking_requests',
  LOCAL_CHAT_MESSAGES: '@local_db_chat_messages',
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

export const getOfferRidePostsLocal = async (
  fromCity?: string,
  toCity?: string,
  travelDate?: string,
  timeRange?: string
): Promise<OfferRidePost[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  if (!raw) return [];
  let posts: OfferRidePost[] = JSON.parse(raw);
  // Auto-heal any posts created with 0 or missing farePerSeat using live dynamic formula
  for (let i = 0; i < posts.length; i++) {
    if (!posts[i].farePerSeat || posts[i].farePerSeat <= 0) {
      try {
        const { getDynamicFareForTrip } = await import('./fareCalculationService');
        const breakdown = await getDynamicFareForTrip(
          posts[i].fromCity,
          posts[i].toCity,
          posts[i].isAC,
          'below_1000cc',
          'gt_road'
        );
        if (breakdown && breakdown.perHeadFixedFare > 0) {
          posts[i].farePerSeat = breakdown.perHeadFixedFare;
        } else {
          posts[i].farePerSeat = 1500;
        }
      } catch {
        posts[i].farePerSeat = 1500;
      }
    }
  }

  if (fromCity && fromCity.trim().length > 0) {
    posts = posts.filter((p) => p.fromCity.toLowerCase() === fromCity.trim().toLowerCase());
  }
  if (toCity && toCity.trim().length > 0) {
    posts = posts.filter((p) => p.toCity.toLowerCase() === toCity.trim().toLowerCase());
  }
  if (travelDate && travelDate.trim().length > 0) {
    posts = posts.filter((p) => !p.travelDate || p.travelDate.toLowerCase().includes(travelDate.trim().toLowerCase()));
  }
  if (timeRange && timeRange.trim().length > 0) {
    posts = posts.filter((p) => !p.departureTime || p.departureTime.toLowerCase().includes(timeRange.trim().toLowerCase()));
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

export const getBookRidePostsLocal = async (
  fromCity?: string,
  toCity?: string,
  travelDate?: string,
  timeRange?: string
): Promise<BookRidePost[]> => {
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
  if (travelDate && travelDate.trim().length > 0) {
    posts = posts.filter((p) => !p.travelDate || p.travelDate.toLowerCase().includes(travelDate.trim().toLowerCase()));
  }
  if (timeRange && timeRange.trim().length > 0) {
    posts = posts.filter((p) => !p.departureTime || p.departureTime.toLowerCase().includes(timeRange.trim().toLowerCase()));
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

// ==========================================
// 3. EDIT & DELETE USER POSTS (MY RIDES)
// ==========================================

export const getMyOfferRidePostsLocal = async (userUid: string): Promise<OfferRidePost[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  if (!raw) return [];
  const posts: OfferRidePost[] = JSON.parse(raw);
  return posts.filter((p) => p.driverUid === userUid);
};

export const getMyBookRidePostsLocal = async (userUid: string): Promise<BookRidePost[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOK_RIDE_POSTS);
  if (!raw) return [];
  const posts: BookRidePost[] = JSON.parse(raw);
  return posts.filter((p) => p.passengerUid === userUid);
};

export const updateOfferRidePostLocal = async (updatedPost: OfferRidePost): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  if (!raw) return;
  let posts: OfferRidePost[] = JSON.parse(raw);
  const index = posts.findIndex((p) => p.id === updatedPost.id);
  if (index !== -1) {
    posts[index] = updatedPost;
    await AsyncStorage.setItem(KEYS.LOCAL_OFFER_RIDE_POSTS, JSON.stringify(posts));
  }
};

export const deleteOfferRidePostLocal = async (postId: string): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_OFFER_RIDE_POSTS);
  if (!raw) return;
  let posts: OfferRidePost[] = JSON.parse(raw);
  posts = posts.filter((p) => p.id !== postId);
  await AsyncStorage.setItem(KEYS.LOCAL_OFFER_RIDE_POSTS, JSON.stringify(posts));
};

export const updateBookRidePostLocal = async (updatedPost: BookRidePost): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOK_RIDE_POSTS);
  if (!raw) return;
  let posts: BookRidePost[] = JSON.parse(raw);
  const index = posts.findIndex((p) => p.id === updatedPost.id);
  if (index !== -1) {
    posts[index] = updatedPost;
    await AsyncStorage.setItem(KEYS.LOCAL_BOOK_RIDE_POSTS, JSON.stringify(posts));
  }
};

export const deleteBookRidePostLocal = async (postId: string): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_BOOK_RIDE_POSTS);
  if (!raw) return;
  let posts: BookRidePost[] = JSON.parse(raw);
  posts = posts.filter((p) => p.id !== postId);
  await AsyncStorage.setItem(KEYS.LOCAL_BOOK_RIDE_POSTS, JSON.stringify(posts));
};

// ==========================================
// 4. IN-APP CHAT MESSAGING
// ==========================================

export const saveChatMessageLocal = async (message: ChatMessage): Promise<void> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_CHAT_MESSAGES);
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  messages.push(message);
  await AsyncStorage.setItem(KEYS.LOCAL_CHAT_MESSAGES, JSON.stringify(messages));
};

export const getChatMessagesLocal = async (
  user1Uid: string,
  user2Uid: string,
  relatedPostId?: string
): Promise<ChatMessage[]> => {
  const raw = await AsyncStorage.getItem(KEYS.LOCAL_CHAT_MESSAGES);
  if (!raw) return [];
  const messages: ChatMessage[] = JSON.parse(raw);
  return messages.filter((m) => {
    const isBetweenUsers =
      (m.senderUid === user1Uid && m.recipientUid === user2Uid) ||
      (m.senderUid === user2Uid && m.recipientUid === user1Uid);
    if (relatedPostId) {
      return isBetweenUsers && m.relatedPostId === relatedPostId;
    }
    return isBetweenUsers;
  }).sort((a, b) => a.timestamp - b.timestamp);
};


