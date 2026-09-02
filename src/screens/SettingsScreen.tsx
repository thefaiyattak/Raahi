import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import ThemedAlertModal, { ThemedAlertProps } from '../components/ThemedAlertModal';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { AppSettings, UserProfile } from '../types';
import { getAppSettingsLocal, saveAppSettingsLocal } from '../services/settingsService';
import { clearDriverProfile, clearUserProfile } from '../services/storage';

interface SettingsScreenProps {
  onBack: () => void;
  onSignOut: () => void;
  onNavigateToProfile?: () => void;
  onSwitchRole?: (newRole: 'passenger' | 'driver') => void;
  userProfile?: UserProfile | null;
}

export default function SettingsScreen({ onBack, onSignOut, onNavigateToProfile, onSwitchRole, userProfile }: SettingsScreenProps) {
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const { language, setLanguage, t, isUrdu, getTextStyle } = useLanguage();

  const [settings, setSettings] = useState<AppSettings>({
    darkMode: isDarkMode,
    pushNotifications: true,
    rideAlerts: true,
    smsAlerts: true,
    soundEnabled: true,
    language: language,
    defaultCity: 'Islamabad',
  });

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

  useEffect(() => {
    loadSettings();
  }, [isDarkMode, language]);

  const loadSettings = async () => {
    const loaded = await getAppSettingsLocal();
    setSettings({ ...loaded, darkMode: isDarkMode, language });
  };

  const updateToggle = async (key: keyof AppSettings, value: any) => {
    if (key === 'darkMode') {
      await setDarkMode(value);
    } else if (key === 'language') {
      await setLanguage(value);
    }
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveAppSettingsLocal({ [key]: value });
  };

  const handleClearCache = () => {
    showAlert({
      title: t('clearCache'),
      message: isUrdu ? 'تلاش کی ہسٹری اور محفوظ کرایوں کا ڈیٹا کامیابی سے صاف ہو گیا ہے۔' : 'Search history and cached route fares have been cleared successfully.',
      type: 'success',
      iconName: 'broom',
      buttons: [{ text: t('close') || 'Close', style: 'default' }],
    });
  };

  const handleResetData = () => {
    showAlert({
      title: t('resetStorage'),
      message: isUrdu ? 'کیا آپ واقعی تمام ایپ ڈیٹا ری سیٹ کرنا چاہتے ہیں؟ آپ کا اکاؤنٹ لاگ آؤٹ ہو جائے گا۔' : 'Are you sure you want to reset all app preferences? This will sign you out.',
      type: 'warning',
      iconName: 'trash-can-outline',
      buttons: [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('confirm') || 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearDriverProfile();
            await clearUserProfile();
            onSignOut();
          },
        },
      ],
    });
  };

  const handleSignOutPress = () => {
    showAlert({
      title: t('logOut'),
      message: isUrdu ? 'کیا آپ واقعی راہی ایپ سے لاگ آؤٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to log out of Raahi?',
      type: 'warning',
      iconName: 'logout',
      buttons: [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('logOut') || 'Log Out', style: 'destructive', onPress: onSignOut },
      ],
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
      {/* Soft UI Elevated App Bar */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={onBack} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }, getTextStyle()]}>
          {t('settingsAndPreferences')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Details Shortcut Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeader, getTextStyle()]}>
            {t('accountAndProfile')}
          </Text>

          <TouchableOpacity style={styles.row} onPress={onNavigateToProfile} activeOpacity={0.8}>
            <View style={styles.rowInfo}>
              <View style={styles.iconCircle}>
                <Icon name="account-circle-outline" size={20} color="#2F9A3C" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, getTextStyle()]}>
                  {t('myProfileAndDetails')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, getTextStyle()]}>
                  {t('viewProfileSubtitle')}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Appearance & Theme Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeader, getTextStyle()]}>
            {t('appearanceAndTheme')}
          </Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.iconCircle}>
                <Icon name="theme-light-dark" size={20} color="#2F9A3C" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, getTextStyle()]}>{t('darkMode')}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, getTextStyle()]}>
                  {isDarkMode ? t('darkModeEnabled') : t('lightModeEnabled')}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={async (val) => {
                await setDarkMode(val);
                setSettings(prev => ({ ...prev, darkMode: val }));
              }}
              trackColor={{ false: theme.border, true: '#2F9A3C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notifications & Sound Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeader, getTextStyle()]}>
            {t('notificationsAndAlerts')}
          </Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.iconCircle}>
                <Icon name="bell-outline" size={20} color="#2F9A3C" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, getTextStyle()]}>{t('pushNotifications')}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, getTextStyle()]}>{t('instantRideAlerts')}</Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(val) => updateToggle('pushNotifications', val)}
              trackColor={{ false: theme.border, true: '#2F9A3C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <View style={styles.iconCircle}>
                <Icon name="volume-high" size={20} color="#2F9A3C" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, getTextStyle()]}>{t('appSounds')}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, getTextStyle()]}>{t('playChimeMatches')}</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateToggle('soundEnabled', val)}
              trackColor={{ false: theme.border, true: '#2F9A3C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data & Storage Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeader, getTextStyle()]}>
            {t('dataAndMaintenance')}
          </Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache} activeOpacity={0.8}>
            <View style={styles.iconCircle}>
              <Icon name="refresh" size={20} color="#2F9A3C" />
            </View>
            <Text style={[styles.actionText, { color: theme.textPrimary }, getTextStyle()]}>{t('clearCache')}</Text>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleResetData} activeOpacity={0.8}>
            <View style={styles.iconCircle}>
              <Icon name="trash-can-outline" size={20} color={theme.textSecondary} />
            </View>
            <Text style={[styles.actionText, { color: theme.textPrimary }, getTextStyle()]}>{t('resetStorage')}</Text>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* About App Info Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.sectionHeader, getTextStyle()]}>
            {t('aboutAndLegal')}
          </Text>

          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('appVersion')}</Text>
            <Text style={[styles.appInfoVal, { color: theme.textPrimary }]}>2.0.0 (Soft UI Edition)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('platformInfo')}</Text>
            <Text style={[styles.appInfoVal, { color: theme.textPrimary }]}>Raahi Intercity Core</Text>
          </View>
        </View>

        {/* Log Out Button (Soft UI Secondary with Red Accent Icon) */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={handleSignOutPress}
          activeOpacity={0.85}
        >
          <Icon name="logout" size={18} color="#E53935" style={{ marginRight: 8 }} />
          <Text style={[styles.signOutBtnText, { color: theme.textPrimary }, getTextStyle()]}>{t('logOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Themed Alert Modal */}
      <ThemedAlertModal {...alertConfig} />
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
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionCard: {
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2F9A3C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E3E7E3',
    marginVertical: 10,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E9ECE9',
    borderRadius: 9999,
    padding: 3,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  langOptionActive: {
    backgroundColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  langTextInactive: {
    color: '#262A27',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    marginLeft: 12,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appInfoLabel: {
    fontSize: 13,
    color: '#8A908B',
  },
  appInfoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  signOutBtn: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
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
  signOutBtnText: {
    fontWeight: '600',
    fontSize: 15,
    color: '#262A27',
  },
});
