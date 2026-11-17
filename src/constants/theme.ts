import { Tokens } from './tokens';

/** Shared DocNow colours (from docnowtesting/design-tokens). Old names stay until screens move over. */
export const Colors = {
  ...Tokens.color,
  // Backward-compat aliases for master's components
  primaryDark: Tokens.color.primaryHover,
  primaryTint: Tokens.color.primarySoft,
  primaryLight: '#7C3AED',
  primarySubtle: '#EDE9FE',
  primaryForeground: Tokens.color.onPrimary,
  background: Tokens.color.surface,
  card: '#ffffff',
  cardMuted: '#F1F5F9',
  foreground: Tokens.color.ink,
  muted: Tokens.color.border,
  mutedForeground: Tokens.color.inkMuted,
  borderFocus: Tokens.color.primary,
  destructive: Tokens.color.danger,
  destructiveTint: '#FEE2E2',
  successTint: '#DCFCE7',
  warningTint: '#FEF3C7',
  amber: '#D97706',
  amberTint: '#FEF3C7',
  teal: '#0D9488',
  tealTint: '#CCFBF1',
  blue: '#2563EB',
  blueTint: '#DBEAFE',
} as const;

/** Controls 8, cards 12, sheets 16 (DESIGN.md). */
export const Radius = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24, full: 999 } as const;

export const Space = Tokens.space;

/** Inter loaded in the root layout; Hindi falls back to the system Devanagari face. */
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** The type scale as ready-made styles: size, line height and the matching Inter face. */
export const Type = {
  caption: { ...Tokens.fontSize.caption, fontFamily: Fonts.medium },
  small: { ...Tokens.fontSize.small, fontFamily: Fonts.regular },
  body: { ...Tokens.fontSize.body, fontFamily: Fonts.regular },
  bodyStrong: { ...Tokens.fontSize.body, fontFamily: Fonts.medium },
  bodyLg: { ...Tokens.fontSize.bodyLg, fontFamily: Fonts.regular },
  titleSm: { ...Tokens.fontSize.titleSm, fontFamily: Fonts.semibold },
  title: { ...Tokens.fontSize.title, fontFamily: Fonts.semibold },
  titleLg: { ...Tokens.fontSize.titleLg, fontFamily: Fonts.semibold },
} as const;

/** Elevation presets (iOS shadow + Android elevation) so cards lift consistently. */
export const Shadow = {
  card: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  raised: Tokens.shadowRaised,
} as const;

/** The "Instant Doctor Consult" and waiting-room gradient. */
export const PrimaryGradient = ['#5B2BB0', '#4b2192', '#3d1a7a'] as const;

