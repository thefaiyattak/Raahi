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
  'home': User,
  'home-variant': LayoutDashboard,
  'language': Globe,
  'translate': Globe,
  'web': Globe,
  'briefcase': LayoutDashboard,
  'briefcase-outline': LayoutDashboard,
  'wallet-outline': Banknote,
  'account-outline': User,
  'menu': SlidersHorizontal,
  'crown': ShieldCheck,
  'heart-outline': Heart,
  'shield-check': ShieldCheck,
  'car': Car,
  'circle-slice-8': CircleDot,
  'map-marker': MapPin,
  'map-marker-path': Route,
  'map-marker-distance': Route,
  'timer-outline': Timer,
  'bookmark-flash-outline': Bookmark,
  'history': History,
  'lightning-bolt': Zap,
  'zap': Zap,
  'radiobox-marked': Zap,
  'cash-check': Banknote,
  'cash-multiple': DollarSign,
  'steering': Navigation,
  'seatbelt': ShieldCheck,
  'star-face': Star,
  'help-circle-outline': CircleHelp,
  'layout-dashboard': LayoutDashboard,
  'compass': Compass,
  'calendar-check': CalendarCheck,
  'chart-box-outline': LayoutDashboard,
  'account-group-outline': UserCheck,
  'camera-plus-outline': Camera,
  'alert-decagram': ShieldAlert,
  'account': User,
  'account-circle': User,
  'account-circle-outline': User,
  'account-tie': UserCheck,
  'account-cowboy-hat': User,
  'account-detective': UserSearch,
  'account-graduation-cap': GraduationCap,
  'account-child': Baby,
  'account-star': Star,
  'account-heart': Heart,
  'account-search': UserSearch,
  'account-check': UserCheck,
  'account-alert': UserCheck,
  'account-alert-outline': UserCheck,
  'shield-alert': ShieldAlert,
  'shield-alert-outline': ShieldAlert,
  'car-cog': Car,
  'car-side': Car,
  'car-off': Car,
  'car-off-outline': Car,
  'car-check': Car,
  'car-info': Car,
  'car-multiple': Car,
  'car-connected': Car,
  'seat-passenger': Armchair,
  'transit-connection-variant': Navigation,
  'filter-variant': SlidersHorizontal,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'arrow-right': ArrowRight,
  'arrow-right-thick': ArrowRight,
  'plus-circle': PlusCircle,
  'plus': Plus,
  'whatsapp': MessageCircle,
  'snowflake': Snowflake,
  'fan': Fan,
  'message-text': MessageSquare,
  'comment-text-outline': MessageSquare,
  'comment-text-multiple-outline': MessageSquare,
  'phone': Phone,
  'cellphone-check': Phone,
  'bell-outline': Bell,
  'bell-ring-outline': BellRing,
  'bell-off-outline': BellOff,
  'cog-outline': Settings,
  'close': X,
  'magnify': Search,
  'map-marker-outline': MapPin,
  'map-search-outline': MapPin,
  'check-all': CheckCheck,
  'check': Check,
  'check-decagram': BadgeCheck,
  'alert-circle-outline': OctagonAlert,
  'trash-can-outline': Trash2,
  'arrow-left': ArrowLeft,
  'theme-light-dark': SunMoon,
  'volume-high': Volume2,
  'broom': Sparkles,
  'refresh': RefreshCw,
  'file-document-outline': FileText,
  'file-certificate-outline': FileText,
  'shield-check-outline': ShieldCheck,
  'logout': LogOut,
  'content-save': Save,
  'pencil': Pencil,
  'pencil-plus': Pencil,
  'alert-octagon': OctagonAlert,
  'database-off-outline': Database,
  'google': Globe,
  'flask-outline': FlaskConical,
  'clock-outline': Clock,
  'share-variant': Share2,
  'help-circle': HelpCircle,
  'lock': Lock,
  'wrench': Wrench,
  'wallet': Banknote,
  'dots-vertical': SlidersHorizontal,
  'content-copy': FileText,
  'upload': Camera,
  'flag-checkered': Route,
  'star': Star,
  'star-outline': Star,
  'star-circle': Star,
  'camera': Camera,
  'camera-plus': Camera,
  'camera-retake-outline': Camera,
  'card-account-details': CreditCard,
  'card-account-details-outline': CreditCard,
  'card-account-details-star-outline': CreditCard,
};

export default function AppIcon({ name, size = 22, color, style }: AppIconProps) {
  const { theme } = useTheme();

  // Dynamic Theme Icon Logic
  let activeColor = theme ? theme.icon : Colors.primary;
  if (color === '#FFFFFF' || color === 'white') {
    activeColor = theme ? theme.white : Colors.white;
  } else if (color && color !== '#374151' && color !== '#111827' && color !== '#000000' && color !== '#4B5563') {
    activeColor = color;
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
