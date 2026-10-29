export const Colors = {
  primary: '#4b2192',
  primaryDark: '#3d1a7a',
  primaryTint: '#F4F0FA',
  primaryLight: '#7C3AED',
  primarySubtle: '#EDE9FE',
  primaryForeground: '#ffffff',
  background: '#F8FAFC',
  card: '#ffffff',
  cardMuted: '#F1F5F9',
  foreground: '#0F172A',
  muted: '#E2E8F0',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  borderFocus: '#4b2192',
  destructive: '#DC2626',
  destructiveTint: '#FEE2E2',
  success: '#16A34A',
  successTint: '#DCFCE7',
  warning: '#D97706',
  warningTint: '#FEF3C7',
  amber: '#D97706',
  amberTint: '#FEF3C7',
  teal: '#0D9488',
  tealTint: '#CCFBF1',
  blue: '#2563EB',
  blueTint: '#DBEAFE',
} as const;

export const Radius = { xs: 4, sm: 8, md: 10, lg: 12, xl: 16, xxl: 24, full: 999 } as const;


/** Type scale: 12 caption, 14 body, 16 title, 20 headline, 24+ hero. */
export const Type = { caption: 12, body: 14, title: 16, headline: 20, hero: 24, display: 32 } as const;

/** Elevation presets (iOS shadow + Android elevation) so cards lift consistently. */
export const Shadow = {
  card: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  raised: { shadowColor: '#3d1a7a', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const;

/** The "Instant Doctor Consult" and waiting-room gradient. */
export const PrimaryGradient = ['#5B2BB0', '#4b2192', '#3d1a7a'] as const;
