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

export const font = {
  body: 15,
  label: 13,
  small: 11,
  h1: 28,
  h2: 22,
  h3: 17,
} as const;

/** Shared card style used across screens. */
export const cardStyle = {
  backgroundColor: theme.card,
  borderRadius: tokens.radius.lg,
  borderWidth: 1,
  borderColor: theme.border,
  padding: tokens.spacing.lg,
} as const;
