// Calendar Vee — Dark Premium Design System
// Inspired by "Temporal Precision" philosophy

export const COLORS = {
  // Core palette
  primary: '#6C63FF',
  primaryLight: '#A5A0FF',
  primaryDark: '#4A42D4',
  secondary: '#38BDF8',
  accent: '#FBBF24',

  // Semantic
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  info: '#38BDF8',
  purple: '#A78BFA',

  // Backgrounds
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  card: 'rgba(30, 41, 59, 0.85)',
  cardSolid: '#1E293B',
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(148, 163, 184, 0.15)',

  // Surfaces
  surface: 'rgba(30, 41, 59, 0.6)',
  surfaceHover: 'rgba(30, 41, 59, 0.9)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  white: '#FFFFFF',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Borders
  border: 'rgba(148, 163, 184, 0.15)',
  borderLight: 'rgba(148, 163, 184, 0.08)',
  borderMedium: 'rgba(148, 163, 184, 0.25)',

  // Category colors
  meeting: '#6C63FF',
  training: '#A78BFA',
  event: '#34D399',
  holiday: '#F87171',
  deadline: '#FBBF24',
  other: '#64748B',

  // Priority colors
  priorityHigh: '#F87171',
  priorityNormal: '#6C63FF',
  priorityLow: '#64748B',

  // Gradients (use with LinearGradient or as reference)
  gradientStart: '#6C63FF',
  gradientEnd: '#38BDF8',

  // Tab bar
  tabActive: '#A5A0FF',
  tabInactive: '#64748B',
  tabBarBg: 'rgba(15, 23, 42, 0.95)',
};

export const CATEGORY_COLORS: Record<string, string> = {
  meeting: COLORS.meeting,
  training: COLORS.training,
  event: COLORS.event,
  holiday: COLORS.holiday,
  deadline: COLORS.deadline,
  other: COLORS.other,
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: COLORS.priorityHigh,
  normal: COLORS.priorityNormal,
  low: COLORS.priorityLow,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  pill: 50,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Common component styles
export const CARD_STYLE = {
  backgroundColor: COLORS.card,
  borderRadius: BORDER_RADIUS.xl,
  borderWidth: 0.5,
  borderColor: COLORS.border,
  padding: SPACING.lg,
};

export const GLASS_STYLE = {
  backgroundColor: COLORS.glass,
  borderRadius: BORDER_RADIUS.lg,
  borderWidth: 0.5,
  borderColor: COLORS.glassBorder,
};

export const theme = {
  colors: COLORS,
  categoryColors: CATEGORY_COLORS,
  priorityColors: PRIORITY_COLORS,
  fontSizes: FONT_SIZES,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  cardStyle: CARD_STYLE,
  glassStyle: GLASS_STYLE,
};

export default theme;
