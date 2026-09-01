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
  onSelectNotification?: (notification: AppNotification) => void;
}

export default function NotificationScreen({
  onBack,
  onUnreadCountChanged,
  onSelectNotification,
}: NotificationScreenProps) {
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
        return 'seat-passenger';
      case 'offer':
        return 'car-side';
      case 'emergency':
        return 'shield-alert';
      case 'system':
      default:
        return 'information-outline';
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
      {/* Soft UI Elevated Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color="#262A27" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, getTextStyle()]}>
          {t('notifications')}
        </Text>
        {unreadCount > 0 ? (
          <View style={styles.unreadBadgeHeader}>
            <Text style={styles.unreadBadgeHeaderText}>{unreadCount} new</Text>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Action Bar */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
            <Icon name="check-all" size={16} color="#2F9A3C" />
            <Text style={[styles.actionBtnText, { color: "#2F9A3C" }, getTextStyle()]}>{t('markAllRead')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleClearAll} activeOpacity={0.8}>
            <Icon name="trash-can-outline" size={16} color="#8A908B" />
            <Text style={[styles.actionBtnText, { color: "#8A908B" }, getTextStyle()]}>{t('clearAll')}</Text>
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
            <View style={styles.emptyIconContainer}>
              <Icon name="bell-off-outline" size={28} color="#8A908B" />
            </View>
            <Text style={[styles.emptyTitle, getTextStyle()]}>
              {t('noActiveNotifications')}
            </Text>
            <Text style={[styles.emptySubtitle, getTextStyle()]}>
              {t('allNotificationsRead')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconName = getIconForType(item.type);
          return (
            <TouchableOpacity
              style={[
                styles.notifCard,
                !item.read ? styles.notifCardUnread : null,
              ]}
              onPress={async () => {
                await handleMarkAsRead(item.id);
                if (onSelectNotification) {
                  onSelectNotification(item);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, !item.read ? styles.iconCircleActive : null]}>
                <Icon name={iconName} size={18} color={!item.read ? "#2F9A3C" : "#8A908B"} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262A27',
  },
  unreadBadgeHeader: {
    backgroundColor: '#2F9A3C',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unreadBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notifCardUnread: {
    borderWidth: 1,
    borderColor: '#2F9A3C',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E9ECE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    flex: 1,
    marginRight: 6,
  },
  unreadTitleText: {
    color: '#2F9A3C',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#8A908B',
  },
  messageText: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F9A3C',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 4,
  },
});
