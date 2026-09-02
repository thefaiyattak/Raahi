import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Icon from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export interface ThemedAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  iconName?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: ThemedAlertButton[];
  autoDismissMs?: number;
  onClose?: () => void;
}

export const ThemedAlertModal: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  iconName,
  type = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  autoDismissMs = 4000,
  onClose,
}) => {
  const { theme } = useTheme();
  const { getTextStyle } = useLanguage();

  React.useEffect(() => {
    if (visible && autoDismissMs > 0 && (!buttons || buttons.length <= 1)) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismissMs, buttons, onClose]);

  if (!visible) return null;

  const defaultIcon =
    iconName ||
    (type === 'success'
      ? 'check-decagram'
      : type === 'error'
      ? 'shield-alert'
      : type === 'warning'
      ? 'alert-octagon'
      : 'routes');

  const iconBgColor =
    type === 'success'
      ? 'rgba(47, 154, 60, 0.12)'
      : type === 'error'
      ? 'rgba(229, 57, 53, 0.12)'
      : type === 'warning'
      ? 'rgba(230, 81, 0, 0.12)'
      : 'rgba(47, 154, 60, 0.12)';

  const iconColor =
    type === 'success'
      ? '#2F9A3C'
      : type === 'error'
      ? '#E53935'
      : type === 'warning'
      ? '#E65100'
      : '#2F9A3C';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {/* Top Accent Icon Circle */}
              <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                <Icon name={defaultIcon} size={28} color={iconColor} />
              </View>

              {/* Title & Description */}
              <Text style={[styles.titleText, { color: theme.textPrimary }, getTextStyle()]}>{title}</Text>
              {message ? <Text style={[styles.messageText, { color: theme.textSecondary }, getTextStyle()]}>{message}</Text> : null}

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  const isPrimary = !isDestructive && !isCancel;

                  let btnStyle = styles.primaryBtn;
                  let textStyle: any = styles.primaryBtnText;

                  if (isDestructive) {
                    btnStyle = styles.destructiveBtn;
                    textStyle = styles.destructiveBtnText;
                  } else if (isCancel) {
                    btnStyle = [styles.cancelBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }];
                    textStyle = [styles.cancelBtnText, { color: theme.textPrimary }];
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.baseBtn,
                        btnStyle,
                        buttons.length > 1 ? { flex: 1 } : { width: '100%' },
                      ]}
                      onPress={() => {
                        if (btn.onPress) btn.onPress();
                        if (onClose) onClose();
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[textStyle, getTextStyle()]}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 42, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262A27',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A908B',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  baseBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#F2F3F2',
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  cancelBtnText: {
    color: '#262A27',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#E53935',
    ...Platform.select({
      ios: {
        shadowColor: '#E53935',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ThemedAlertModal;
