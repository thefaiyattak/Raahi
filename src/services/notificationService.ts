import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '../types';

const NOTIFICATIONS_KEY = '@app_notifications';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    title: 'Welcome to Raahi! 🚗',
    message: 'Thank you for joining Raahi. You can now post ride offers or request passenger seats seamlessly.',
    type: 'system',
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    read: false,
  },
  {
    id: 'notif_rate_update',
    title: 'Dynamic Fare Rate Update',
    message: 'Route fare rates have been synchronized with the latest intercity standards.',
    type: 'system',
    timestamp: Date.now() - 3600000 * 5, // 5 hours ago
    read: false,
  },
  {
    id: 'notif_emergency_feature',
    title: 'Emergency Safety Helpline 🛡️',
    message: 'Tap the top-right shield button anytime during a trip to quickly dial 15 or dispatch SMS emergency alerts.',
    type: 'emergency',
    timestamp: Date.now() - 3600000 * 24, // 1 day ago
    read: true,
  },
];

export const getNotificationsLocal = async (): Promise<AppNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) {
      // Seed initial notifications
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed: AppNotification[] = JSON.parse(raw);
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.warn('[NotificationService] Error reading notifications', e);
    return INITIAL_NOTIFICATIONS;
  }
};

export const addNotificationLocal = async (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): Promise<AppNotification> => {
  try {
    const list = await getNotificationsLocal();
    const newNotif: AppNotification = {
      ...notification,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      read: false,
    };
    const updated = [newNotif, ...list];
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return newNotif;
  } catch (e) {
    console.error('[NotificationService] Error saving notification', e);
    throw new Error('Failed to add notification.');
  }
};

export const markNotificationAsReadLocal = async (id: string): Promise<AppNotification[]> => {
  try {
    const list = await getNotificationsLocal();
    const updated = list.map((item) => (item.id === id ? { ...item, read: true } : item));
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('[NotificationService] Error marking as read', e);
    return [];
  }
};

export const markAllNotificationsAsReadLocal = async (): Promise<AppNotification[]> => {
  try {
    const list = await getNotificationsLocal();
    const updated = list.map((item) => ({ ...item, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('[NotificationService] Error marking all read', e);
    return [];
  }
};

export const clearAllNotificationsLocal = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
  } catch (e) {
    console.error('[NotificationService] Error clearing notifications', e);
  }
};
