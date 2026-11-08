import { Tokens } from './tokens';

/** Shared DocNow colours (from docnowtesting/design-tokens). Old names stay until screens move over. */
export const Colors = {
  ...Tokens.color,
  primaryDark: Tokens.color.primaryHover,
  primaryTint: Tokens.color.primarySoft,
  primaryForeground: Tokens.color.onPrimary,
  background: Tokens.color.surface,
  foreground: Tokens.color.ink,
  // Used mostly for borders and quiet fills.
  muted: Tokens.color.border,
  mutedForeground: Tokens.color.inkMuted,
  destructive: Tokens.color.danger,
} as const;

/** Controls 8, cards 12, sheets 16 (DESIGN.md). */
export const Radius = { sm: 6, md: 8, lg: 12, xl: 16, full: 999 } as const;

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

export const Shadow = { raised: Tokens.shadowRaised } as const;
