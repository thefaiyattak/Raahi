import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '../components/AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { AppSettings } from '../types';
import { getAppSettingsLocal, saveAppSettingsLocal } from '../services/settingsService';
import { clearDriverProfile, clearUserProfile } from '../services/storage';

interface SettingsScreenProps {
  onBack: () => void;
  onSignOut: () => void;
  onNavigateToProfile?: () => void;
}

export default function SettingsScreen({ onBack, onSignOut, onNavigateToProfile }: SettingsScreenProps) {
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const { language, setLanguage, t, isUrdu } = useLanguage();

  const [settings, setSettings] = useState<AppSettings>({
    darkMode: isDarkMode,
    pushNotifications: true,
    rideAlerts: true,
    smsAlerts: true,
    soundEnabled: true,
    language: language,
    defaultCity: 'Islamabad',
  });

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
    Alert.alert(
      t('clearCache'),
      'Search history and cached route fares have been cleared.',
      [{ text: t('close') }]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      t('resetStorage'),
      'Are you sure you want to reset all app preferences? This will sign you out.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            await clearDriverProfile();
            await clearUserProfile();
            onSignOut();
          },
        },
      ]
    );
  };

  const handleSignOutPress = () => {
    Alert.alert(t('logOut'), 'Are you sure you want to log out of Raahi?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logOut'), style: 'destructive', onPress: onSignOut },
    ]);
  };

  const textStyle = isUrdu ? { textAlign: 'right' as const, lineHeight: 22 } : {};

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.cardBackground} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }, textStyle]}>
          {t('settingsAndPreferences')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Account & Profile */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {isUrdu ? 'اکاؤنٹ اور پروفائل' : 'Account & Profile'}
          </Text>

          <TouchableOpacity style={styles.row} onPress={onNavigateToProfile}>
            <View style={styles.rowInfo}>
              <Icon name="account-circle-outline" size={22} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
                  {isUrdu ? 'پروفائل کی تفصیلات' : 'My Profile & Details'}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, textStyle]}>
                  {isUrdu ? 'ذاتی معلومات اور سی این آئی سی کی ترتیبات دیکھیں' : 'View profile, phone number and CNIC details'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Appearance & Theme */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {t('appearanceAndTheme')}
          </Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Icon name="theme-light-dark" size={22} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
                  {t('darkMode')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, textStyle]}>
                  {t('darkModeSubtitle')}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(val) => updateToggle('darkMode', val)}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={isDarkMode ? theme.primary : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Notifications & Sound */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {t('notificationsAndAlerts')}
          </Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Icon name="bell-ring-outline" size={22} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
                  {t('pushNotifications')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, textStyle]}>
                  Receive trip updates and seat requests
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(val) => updateToggle('pushNotifications', val)}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={settings.pushNotifications ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Icon name="car-connected" size={22} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
                  {t('rideMatchAlerts')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, textStyle]}>
                  Alert when a ride matches your route
                </Text>
              </View>
            </View>
            <Switch
              value={settings.rideAlerts}
              onValueChange={(val) => updateToggle('rideAlerts', val)}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={settings.rideAlerts ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Icon name="volume-high" size={22} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
                  {t('appSounds')}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }, textStyle]}>
                  In-app audio feedback
                </Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateToggle('soundEnabled', val)}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={settings.soundEnabled ? theme.primary : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Regional & Language */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {t('languageAndRegional')}
          </Text>

          <View style={styles.languageRow}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }, textStyle]}>
              {t('appLanguage')}
            </Text>
            <View style={[styles.langSelector, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.langOption, language === 'English' ? { backgroundColor: theme.primary } : null]}
                onPress={() => updateToggle('language', 'English')}
              >
                <Text style={[styles.langText, language === 'English' ? { color: theme.white } : { color: theme.textSecondary }]}>
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, language === 'Urdu' ? { backgroundColor: theme.primary } : null]}
                onPress={() => updateToggle('language', 'Urdu')}
              >
                <Text style={[styles.langText, language === 'Urdu' ? { color: theme.white } : { color: theme.textSecondary }]}>
                  اردو (Urdu)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data & Storage */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {t('dataAndMaintenance')}
          </Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Icon name="broom" size={22} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }, textStyle]}>
              {t('clearCache')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleResetData}>
            <Icon name="refresh" size={22} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }, textStyle]}>
              {t('resetStorage')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal & About */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.primary }, textStyle]}>
            {t('aboutAndLegal')}
          </Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => setShowTermsModal(true)}>
            <Icon name="file-document-outline" size={22} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }, textStyle]}>
              {t('termsOfService')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.actionRow} onPress={() => setShowPrivacyModal(true)}>
            <Icon name="shield-check-outline" size={22} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textPrimary }, textStyle]}>
              {t('privacyPolicy')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoLabel, { color: theme.textSecondary }]}>{t('appVersion')}</Text>
            <Text style={[styles.appInfoVal, { color: theme.textPrimary }]}>Raahi v1.0.0 (Build 2026.07)</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: theme.primary }]} onPress={handleSignOutPress}>
          <Icon name="logout" size={20} color={theme.white} style={{ marginRight: 8 }} />
          <Text style={[styles.signOutBtnText, { color: theme.white }, textStyle]}>
            {t('logOut')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Terms of Service Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }, textStyle]}>{t('termsOfService')}</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              <Text style={[styles.modalBody, { color: theme.textSecondary }, textStyle]}>
                {t('termsOfServiceContent')}
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowTermsModal(false)}>
              <Text style={[styles.modalCloseText, { color: theme.white }, textStyle]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }, textStyle]}>{t('privacyPolicy')}</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              <Text style={[styles.modalBody, { color: theme.textSecondary }, textStyle]}>
                {t('privacyPolicyContent')}
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowPrivacyModal(false)}>
              <Text style={[styles.modalCloseText, { color: theme.white }, textStyle]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  appInfoLabel: {
    fontSize: 14,
  },
  appInfoVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    elevation: 3,
  },
  signOutBtnText: {
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalCloseBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseText: {
    fontWeight: '700',
  },
});


