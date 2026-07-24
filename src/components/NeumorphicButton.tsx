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
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

interface NeumorphicButtonProps {
  onPress: () => void;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'surface' | 'danger' | 'icon';
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
  const { theme, isDarkMode } = useTheme();
  const { getTextStyle } = useLanguage();

  // Tactile Click Animation Scale & Elevation Depress State
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const depressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(depressAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 8,
      }),
      Animated.timing(depressAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Determine Colors & Shadows based on Variant and Theme
  const getVariantStyles = () => {
    if (variant === 'primary') {
      return {
        backgroundColor: theme.primary,
        borderColor: theme.primaryDark,
        textColor: '#FFFFFF',
        topLightShadow: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        bottomDarkShadow: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(46, 125, 50, 0.35)',
      };
    } else if (variant === 'danger') {
      return {
        backgroundColor: '#D32F2F',
        borderColor: '#B71C1C',
        textColor: '#FFFFFF',
        topLightShadow: 'rgba(255, 255, 255, 0.2)',
        bottomDarkShadow: 'rgba(183, 28, 28, 0.4)',
      };
    } else if (variant === 'icon') {
      return {
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
        textColor: theme.primary,
        topLightShadow: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
        bottomDarkShadow: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.12)',
      };
    } else {
      // secondary / surface
      return {
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
        textColor: theme.textPrimary,
        topLightShadow: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
        bottomDarkShadow: isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.1)',
      };
    }
  };

  const currentVariant = getVariantStyles();

  // Dynamic Shadow Elevation shift when pressed
  const shadowOpacity = depressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.neumorphicOuterContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        {/* Soft 3D Neumorphic Base Box */}
        <Animated.View
          style={[
            styles.neumorphicBox,
            {
              backgroundColor: currentVariant.backgroundColor,
              borderColor: currentVariant.borderColor,
              shadowColor: currentVariant.bottomDarkShadow,
              opacity: shadowOpacity,
            },
            variant === 'icon' ? styles.iconShape : null,
          ]}
        >
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            {title && (
              <Text
                style={[
                  styles.buttonText,
                  { color: currentVariant.textColor },
                  getTextStyle(textStyle as any),
                ]}
              >
                {title}
              </Text>
            )}
            {children}
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  neumorphicOuterContainer: {
    marginVertical: 4,
  },
  neumorphicBox: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 3D Neumorphic Extrusion Shadows
    ...Platform.select({
      ios: {
        shadowOffset: { width: 4, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconShape: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
