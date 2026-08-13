import type { TextStyle } from 'react-native';
import { tokens } from '@tgim/shared';

/**
 * React Native theme. Everything visual derives from @tgim/shared tokens so the
 * mobile client and the web simulator cannot drift. This is the "design tokens
 * before screens" principle in practice — components read `theme`, never literals.
 */
export const theme = {
  ...tokens,
  // Convenience aliases for the most-used values.
  accent: tokens.palette.accent,
  accentLight: tokens.palette.accentLight,
  bg: tokens.palette.bgMain,
  text: tokens.slate[900],
  textMuted: tokens.slate[500],
  border: tokens.slate[200],
  card: '#ffffff',
} as const;

/**
 * Semantic type scale. Every text on a consumer surface renders through one of
 * these roles — screens must not hardcode fontSize/fontWeight. Weights come
 * from the shared typography tokens; line heights are tuned per role.
 */
export type FontRole =
  | 'logo' // brand mark (TG•M)
  | 'display' // full-screen value statements
  | 'h1' // screen titles
  | 'h2' // section titles
  | 'h3' // card titles
  | 'body' // default prose
  | 'bodyStrong' // emphasised prose / list titles
  | 'label' // labels, hints, button text
  | 'small' // captions, meta
  | 'caption' // tiny meta, tab labels
  | 'micro'; // brand tagline

export const fontScale: Record<FontRole, { fontSize: number; fontWeight: TextStyle['fontWeight']; lineHeight: number }> = {
  logo: { fontSize: 26, fontWeight: tokens.typography.weight.logo, lineHeight: 32 },
  display: { fontSize: 24, fontWeight: tokens.typography.weight.emphasis, lineHeight: 31 },
  h1: { fontSize: 22, fontWeight: tokens.typography.weight.emphasis, lineHeight: 29 },
  h2: { fontSize: 18, fontWeight: tokens.typography.weight.heading, lineHeight: 24 },
  h3: { fontSize: 16, fontWeight: tokens.typography.weight.heading, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: tokens.typography.weight.body, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: tokens.typography.weight.label, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: tokens.typography.weight.label, lineHeight: 18 },
  small: { fontSize: 12, fontWeight: tokens.typography.weight.label, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: tokens.typography.weight.label, lineHeight: 14 },
  micro: { fontSize: 10, fontWeight: tokens.typography.weight.emphasis, lineHeight: 13 },
} as const;

/** Shared card style used across screens. */
export const cardStyle = {
  backgroundColor: theme.card,
  borderRadius: tokens.radius.lg,
  borderWidth: 1,
  borderColor: theme.border,
  padding: tokens.spacing.lg,
} as const;
