import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from './AppIcon';
import { useLanguage } from '../i18n/LanguageContext';

interface RoleSelectModalProps {
  visible: boolean;
  activeRole?: 'passenger' | 'driver';
  onSelectRole: (role: 'passenger' | 'driver') => void;
  canDismiss?: boolean;
  onDismiss?: () => void;
}

export default function RoleSelectModal({
  visible,
  activeRole = 'passenger',
  onSelectRole,
  canDismiss = false,
  onDismiss,
}: RoleSelectModalProps) {
  const { getTextStyle } = useLanguage();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {
        if (canDismiss && onDismiss) {
          onDismiss();
        }
      }}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F3F2" />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Icon name="routes" size={28} color="#2F9A3C" />
            </View>
            <Text style={[styles.title, getTextStyle()]}>
              Welcome to Raahi
            </Text>
            <Text style={[styles.subtitle, getTextStyle()]}>
              Select your initial profile mode to continue.
            </Text>
          </View>

          {/* Cards Container */}
          <View style={styles.cardsContainer}>
            {/* Passenger Mode Option */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                activeRole === 'passenger' ? styles.roleCardActive : null,
              ]}
              onPress={() => onSelectRole('passenger')}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    activeRole === 'passenger' ? styles.iconBoxActive : null,
                  ]}
                >
                  <Icon
                    name="account"
                    size={22}
                    color={activeRole === 'passenger' ? '#FFFFFF' : '#262A27'}
                  />
                </View>
                {activeRole === 'passenger' && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                    <Text style={styles.selectedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.roleTitle, getTextStyle()]}>
                Passenger Mode
              </Text>
              <Text style={[styles.roleDesc, getTextStyle()]}>
                Search available rides, request seats, and travel between cities with verified drivers.
              </Text>

              <View style={styles.tagsRow}>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>Search Rides</Text>
                </View>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>Book Seats</Text>
                </View>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>SOS Safety</Text>
                </View>
              </View>

              <View
                style={[
                  styles.selectBtn,
                  activeRole === 'passenger' ? styles.selectBtnActive : styles.selectBtnInactive,
                ]}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    activeRole === 'passenger' ? styles.selectBtnTextActive : styles.selectBtnTextInactive,
                    getTextStyle(),
                  ]}
                >
                  Continue as Passenger ➔
                </Text>
              </View>
            </TouchableOpacity>

            {/* Driver Mode Option */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                activeRole === 'driver' ? styles.roleCardActive : null,
              ]}
              onPress={() => onSelectRole('driver')}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    activeRole === 'driver' ? styles.iconBoxActive : null,
                  ]}
                >
                  <Icon
                    name="steering"
                    size={22}
                    color={activeRole === 'driver' ? '#FFFFFF' : '#262A27'}
                  />
                </View>
                {activeRole === 'driver' && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check" size={12} color="#FFFFFF" />
                    <Text style={styles.selectedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.roleTitle, getTextStyle()]}>
                Driver Mode
              </Text>
              <Text style={[styles.roleDesc, getTextStyle()]}>
                Offer empty seats on intercity trips, recover fuel expenses, and manage bookings.
              </Text>

              <View style={styles.tagsRow}>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>Post Rides</Text>
                </View>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>Recover Fuel</Text>
                </View>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>Vehicle Setup</Text>
                </View>
              </View>

              <View
                style={[
                  styles.selectBtn,
                  activeRole === 'driver' ? styles.selectBtnActive : styles.selectBtnInactive,
                ]}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    activeRole === 'driver' ? styles.selectBtnTextActive : styles.selectBtnTextInactive,
                    getTextStyle(),
                  ]}
                >
                  Continue as Driver ➔
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <Text style={[styles.footerNote, getTextStyle()]}>
            You can switch between Passenger and Driver anytime from the top bar.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F3F2',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#262A27',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8A908B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  cardsContainer: {
    gap: 16,
    marginVertical: 12,
  },
  roleCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'transparent',
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
  roleCardActive: {
    borderColor: '#2F9A3C',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#E9ECE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#2F9A3C',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F9A3C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: '#8A908B',
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  featureTag: {
    backgroundColor: '#F2F3F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#262A27',
  },
  selectBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnActive: {
    backgroundColor: '#2F9A3C',
  },
  selectBtnInactive: {
    backgroundColor: '#E9ECE9',
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectBtnTextActive: {
    color: '#FFFFFF',
  },
  selectBtnTextInactive: {
    color: '#262A27',
  },
  footerNote: {
    fontSize: 12,
    color: '#8A908B',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
  },
});
