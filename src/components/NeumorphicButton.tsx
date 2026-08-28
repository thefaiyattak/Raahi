import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  Animated,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  View,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

interface NeumorphicButtonProps {
  onPress: () => void;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'surface' | 'danger' | 'icon' | 'disabled';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function NeumorphicButton({
  onPress,
  title,
  icon,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  children,
}: NeumorphicButtonProps) {
  const { getTextStyle } = useLanguage();

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || variant === 'disabled') return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || variant === 'disabled') return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const isPrimary = variant === 'primary';
  const isDisabled = disabled || variant === 'disabled';
  const isIcon = variant === 'icon';

  return (
    <TouchableWithoutFeedback
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.base,
          isPrimary && styles.primary,
          !isPrimary && !isDisabled && styles.secondary,
          isDisabled && styles.disabled,
          isIcon && styles.iconBtn,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {icon && <View style={title ? styles.iconMargin : undefined}>{icon}</View>}
        {title ? (
          <Text
            style={[
              styles.text,
              isPrimary && styles.primaryText,
              !isPrimary && !isDisabled && styles.secondaryText,
              isDisabled && styles.disabledText,
              getTextStyle(),
              textStyle,
            ]}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: '#2F9A3C',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  secondary: {
    backgroundColor: '#FFFFFF',
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
  disabled: {
    backgroundColor: '#E9ECE9',
    elevation: 0,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 0,
  },
  iconMargin: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#262A27',
  },
  disabledText: {
    color: '#8A908B',
  },
});
