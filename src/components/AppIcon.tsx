import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  User,
  UserCheck,
  UserSearch,
  ShieldAlert,
  ShieldCheck,
  Car,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  PlusCircle,
  Plus,
  Minus,
  Crosshair,
  MessageCircle,
  MessageSquare,
  Phone,
  Bell,
  BellRing,
  BellOff,
  Settings,
  X,
  MapPin,
  CheckCheck,
  Check,
  Trash2,
  ArrowLeft,
  SunMoon,
  Volume2,
  Sparkles,
  RefreshCw,
  FileText,
  LogOut,
  Save,
  Pencil,
  OctagonAlert,
  Snowflake,
  Fan,
  SlidersHorizontal,
  Share2,
  Armchair,
  GraduationCap,
  Baby,
  Star,
  Heart,
  Database,
  Globe,
  FlaskConical,
  Navigation,
  Clock,
  HelpCircle,
  Lock,
  Compass,
  Wrench,
  Camera,
  CreditCard,
  CircleDot,
  History,
  Timer,
  Bookmark,
  Zap,
  Banknote,
  DollarSign,
  Route,
  Smile,
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  CircleHelp,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Send,
  SendHorizontal,
} from 'lucide-react-native';

import Colors from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// Clean minimalist line-art vector icon mapping directly from Lucide SVG icons
const OUTLINE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Navigation & Bottom Bar
  'home': LayoutDashboard,
  'home-variant': LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  'lightning-bolt': Zap,
  'zap': Zap,
  'cog': Settings,
  'cog-outline': Settings,
  'settings': Settings,

  // Route & Travel
  'routes': Route,
  'route': Route,
  'map-marker': MapPin,
  'map-marker-outline': MapPin,
  'map-search-outline': Search,
  'map-marker-path': Route,
  'map-marker-distance': Route,
  'flag-checkered': Route,
  'compass': Compass,
  'navigation': Navigation,
  'steering': Navigation,
  'transit-connection-variant': Navigation,

  // User & Accounts
  'account': User,
  'account-outline': User,
  'account-circle': User,
  'account-circle-outline': User,
  'account-tie': UserCheck,
  'account-check': UserCheck,
  'account-search': UserSearch,
  'account-detective': UserSearch,
  'account-group-outline': UserCheck,
  'account-graduation-cap': GraduationCap,
  'account-child': Baby,
  'account-star': Star,
  'account-heart': Heart,
  'account-alert': UserCheck,
  'account-alert-outline': UserCheck,
  'account-cowboy-hat': User,

  // Vehicles
  'car': Car,
  'car-side': Car,
  'car-cog': Car,
  'car-off': Car,
  'car-off-outline': Car,
  'car-check': Car,
  'car-info': Car,
  'car-multiple': Car,
  'car-connected': Car,
  'seat-passenger': Armchair,
  'seatbelt': ShieldCheck,

  // Common UI Controls
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-left': ArrowLeft,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-right-thick': ArrowRight,
  'plus': Plus,
  'minus': Minus,
  'plus-circle': PlusCircle,
  'close': X,
  'crosshairs-gps': Crosshair,
  'crosshairs': Crosshair,
  'palette': Sparkles,
  'earth': Globe,
  'weather-night': SunMoon,
  'magnify': Search,
  'search': Search,
  'check': Check,
  'check-all': CheckCheck,
  'check-decagram': BadgeCheck,
  'check-circle-2': CheckCircle2,
  'filter-variant': SlidersHorizontal,
  'dots-vertical': SlidersHorizontal,
  'menu': SlidersHorizontal,

  // Notifications & Messages
  'bell': Bell,
  'bell-outline': Bell,
  'bell-ring-outline': BellRing,
  'bell-off-outline': BellOff,
  'chat': MessageSquare,
  'chat-outline': MessageSquare,
  'chat-processing-outline': MessageSquare,
  'message-text': MessageSquare,
  'message-square': MessageSquare,
  'message-reply': MessageSquare,
  'message-reply-text': MessageSquare,
  'whatsapp': MessageCircle,
  'comment-text-outline': MessageSquare,
  'comment-text-multiple-outline': MessageSquare,
  'phone': Phone,
  'phone-outline': Phone,
  'cellphone-check': Phone,
  'send': SendHorizontal,
  'send-outline': SendHorizontal,

  // Safety & Verification
  'shield-check': ShieldCheck,
  'shield-check-outline': ShieldCheck,
  'shield-alert': ShieldAlert,
  'shield-alert-outline': ShieldAlert,
  'alert-octagon': OctagonAlert,
  'alert-circle': AlertCircle,
  'alert-circle-outline': AlertCircle,
  'alert-decagram': ShieldAlert,

  // Tools, Files, System
  'theme-light-dark': SunMoon,
  'translate': Globe,
  'language': Globe,
  'web': Globe,
  'google': Globe,
  'volume-high': Volume2,
  'broom': Sparkles,
  'refresh': RefreshCw,
  'trash-can-outline': Trash2,
  'trash-2': Trash2,
  'logout': LogOut,
  'content-save': Save,
  'pencil': Pencil,
  'pencil-plus': Pencil,
  'file-document-outline': FileText,
  'file-certificate-outline': FileCheck,
  'file-check': FileCheck,
  'camera': Camera,
  'camera-plus': Camera,
  'camera-plus-outline': Camera,
  'camera-retake-outline': Camera,
  'upload': Camera,
  'card-account-details': CreditCard,
  'card-account-details-outline': CreditCard,
  'card-account-details-star-outline': CreditCard,
  'clock': Clock,
  'clock-outline': Clock,
  'timer-outline': Timer,
  'history': History,
  'star': Star,
  'star-outline': Star,
  'star-circle': Star,
  'star-face': Smile,
  'heart': Heart,
  'heart-outline': Heart,
  'wallet': Banknote,
  'wallet-outline': Banknote,
  'cash-check': Banknote,
  'cash-multiple': DollarSign,
  'banknote': Banknote,
  'snowflake': Snowflake,
  'fan': Fan,
  'sparkles': Sparkles,
  'share-variant': Share2,
  'share-2': Share2,
  'help-circle': HelpCircle,
  'help-circle-outline': CircleHelp,
  'information-outline': CircleHelp,
  'info': CircleHelp,
  'lock': Lock,
  'wrench': Wrench,
  'database': Database,
  'database-off-outline': Database,
  'flask-outline': FlaskConical,
  'bookmark': Bookmark,
  'bookmark-flash-outline': Bookmark,
  'briefcase': LayoutDashboard,
  'briefcase-outline': LayoutDashboard,
  'calendar-check': CalendarCheck,
  'chart-box-outline': LayoutDashboard,
  'radiobox-marked': Zap,
  'circle-slice-8': CircleDot,
  'crown': ShieldCheck,
};

export default function AppIcon({ name, size = 22, color, style }: AppIconProps) {
  const { theme } = useTheme();

  // Dynamic Theme Icon Logic
  let activeColor = color;
  if (!activeColor) {
    activeColor = theme ? theme.icon : '#262A27';
  } else if (activeColor === '#FFFFFF' || activeColor === 'white') {
    activeColor = '#FFFFFF';
  }

  const IconComponent = OUTLINE_ICON_MAP[name] || HelpCircle;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.iconBox,
        { width: size, height: size },
        style,
      ]}
    >
      <IconComponent
        size={size}
        color={activeColor}
        strokeWidth={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
