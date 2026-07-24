import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { AppNotification } from '../types';
import {
  getNotificationsLocal,
  markNotificationAsReadLocal,
  markAllNotificationsAsReadLocal,
  clearAllNotificationsLocal,
} from '../services/notificationService';

interface NotificationScreenProps {
  onBack: () => void;
  onUnreadCountChanged?: (count: number) => void;
}

export default function NotificationScreen({
  onBack,
  onUnreadCountChanged,
}: NotificationScreenProps) {
  const { theme } = useTheme();
  const { t, isUrdu, getTextStyle } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const list = await getNotificationsLocal();
    setNotifications(list);
    const unread = list.filter((n) => !n.read).length;
    if (onUnreadCountChanged) onUnreadCountChanged(unread);
  };

  const handleMarkAsRead = async (id: string) => {
    const updated = await markNotificationAsReadLocal(id);
    setNotifications(updated);
    const unread = updated.filter((n) => !n.read).length;
    if (onUnreadCountChanged) onUnreadCountChanged(unread);
  };

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsAsReadLocal();
    setNotifications(updated);
    if (onUnreadCountChanged) onUnreadCountChanged(0);
  };

  const handleClearAll = () => {
    Alert.alert(t('clearAll'), 'Are you sure you want to clear all notifications?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('clearAll'),
        style: 'destructive',
        onPress: async () => {
          await clearAllNotificationsLocal();
          setNotifications([]);
          if (onUnreadCountChanged) onUnreadCountChanged(0);
        },
      },
    ]);
  };

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'booking':
        return { name: 'seat-passenger', color: theme.primary };
      case 'offer':
        return { name: 'car-side', color: theme.primary };
      case 'emergency':
        return { name: 'shield-alert', color: theme.primary };
      case 'system':
      default:
        return { name: 'information', color: theme.primary };
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return isUrdu ? 'ابھی' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }, getTextStyle()]}>
          {t('notifications')}
        </Text>
        <TouchableOpacity style={{ padding: 4 }}>
          <Icon name="dots-vertical" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Action Bar */}
      {notifications.length > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead}>
            <Icon name="check-all" size={18} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.primary }, getTextStyle()]}>{t('markAllRead')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleClearAll}>
            <Icon name="trash-can-outline" size={18} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.primary }, getTextStyle()]}>{t('clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-off-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }, getTextStyle()]}>
              {t('noActiveNotifications')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }, getTextStyle()]}>
              {t('allNotificationsRead')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = getIconForType(item.type);
          return (
            <TouchableOpacity
              style={[styles.notifCard, !item.read ? styles.unreadCard : null]}
              onPress={() => handleMarkAsRead(item.id)}
            >
              <View style={styles.iconCircle}>
                <Icon name={icon.name} size={22} color={icon.color} />
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifHeaderRow}>
                  <Text style={[styles.notifTitle, !item.read ? styles.unreadTitleText : null]}>
                    {item.title}
                  </Text>
                  <Text style={styles.timeText}>{formatTimeAgo(item.timestamp)}</Text>
                </View>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
      <View style={{ flexDirection: 'row', backgroundColor: theme.cardBackground, borderTopWidth: 1, borderTopColor: theme.border, height: 60, alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 }}>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onBack}>
          <Icon name="home" size={20} color={theme.textMuted} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: theme.textMuted }}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onBack}>
          <Icon name="magnify" size={20} color={theme.textMuted} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: theme.textMuted }}>Home</Text>
        </TouchableOpacity>

        {/* Center Floating Plus Button */}
        <TouchableOpacity
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginTop: -20, elevation: 4, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
          onPress={onBack}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onBack}>
          <Icon name="calendar-check" size={20} color={theme.textMuted} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: theme.textMuted }}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onBack}>
          <Icon name="account" size={20} color={theme.textMuted} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: theme.textMuted }}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  unreadBadgeHeader: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#43A047',
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  unreadCard: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#43A047',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadTitleText: {
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#43A047',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
