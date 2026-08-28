/**
 * Raahi Soft UI / Neumorphic Design Tokens & Metrics
 * Single Visual Source of Truth based on Reference UI-Kit
 */

export const Colors = {
  primaryGreen: '#2F9A3C',
  pureWhite: '#FFFFFF',
  appBackground: '#F2F3F2',
  primaryText: '#262A27',
  secondaryText: '#8A908B',
  mutedSurface: '#E9ECE9',
  lightBorder: '#E3E7E3',
  lightHighlight: '#FFFFFF',
  softShadow: 'rgba(38, 42, 39, 0.12)',
  deepSoftShadow: 'rgba(38, 42, 39, 0.18)',
  greenShadow: 'rgba(47, 154, 60, 0.25)',
  greenTint: 'rgba(47, 154, 60, 0.10)',
  disabledOverlay: 'rgba(138, 144, 139, 0.20)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Typography = {
  screenTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#262A27',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#262A27',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#262A27',
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#262A27',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8A908B',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#262A27',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8A908B',
  },
  importantResult: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#262A27',
  },
};

export const Radius = {
  controlSmall: 12,
  inputCompact: 16,
  cardButton: 20,
  largeContainer: 24,
  fullPill: 9999,
};

export const SoftShadows = {
  // Soft elevated white surface
  card: {
    shadowColor: '#262A27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  // Active tactile green button
  primaryButton: {
    shadowColor: '#2F9A3C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
    backgroundColor: '#2F9A3C',
  },
  // Inactive / white button
  secondaryButton: {
    shadowColor: '#262A27',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  // Floating top header or floating bottom navigation bar
  floatingBar: {
    shadowColor: '#262A27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  // Subtle input elevation
  input: {
    shadowColor: '#262A27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1.5,
    backgroundColor: '#FFFFFF',
  },
};

export const ComponentMetrics = {
  headerHeight: 56,
  inputHeight: 52,
  buttonHeight: 52,
  buttonHeightCompact: 38,
  iconButtonSize: 48,
  tabBarHeight: 68,
  cardPadding: 16,
  largeCardPadding: 20,
  screenPaddingHorizontal: 20,
};
