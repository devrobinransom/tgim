import { z } from 'zod';
import { IssueCategory, IssueSeverity, PromiseStatus } from './types.js';

/**
 * TGIM design tokens — the single source of truth for the visual language,
 * extracted from docs/DESIGN.md (which mirrors apps/web/src/index.css :root).
 *
 * Both the web simulator and the mobile client consume these so the two
 * surfaces cannot drift apart. Plain data (no React/RN imports) so it is
 * safe to import from any package.
 */

export const palette = {
  /** Brand orange — all primary interactive elements and active states. */
  accent: '#ff5200',
  /** Lighter orange — gradient top, link hover. */
  accentLight: '#ff7e29',
  /** Primary gradient stops (start → end), 135deg in CSS. */
  primaryGradient: ['#ff7e29', '#ff5200'] as const,

  success: '#10b981',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',

  bgMain: '#f8fafc',
  bgCard: 'rgba(255,255,255,0.95)',
  borderCard: 'rgba(15,23,42,0.08)',
} as const;

/** Slate text/neutral ramp (used inline everywhere in the web sim). */
export const slate = {
  900: '#0f172a', // primary text / headings
  800: '#1e293b',
  700: '#334155',
  600: '#475569',
  500: '#64748b', // muted
  400: '#94a3b8',
  300: '#cbd5e1', // dividers
  200: '#e2e8f0',
  100: '#f1f5f9',
  50: '#f8fafc',
} as const;

/** 8px-multiple spacing grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Corner radii: 6–16 for cards/badges, 40 for the phone frame, pill = 9999. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  frame: 40,
  pill: 9999,
} as const;

export const typography = {
  fontFamily: 'Outfit',
  fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  weight: {
    body: '400',
    label: '600',
    heading: '700',
    emphasis: '800',
    logo: '900',
  },
} as const;

/** Category → marker/badge color (docs/DESIGN.md "Category → color"). */
export const categoryColor: Record<IssueCategory, string> = {
  water: '#3b82f6',
  roads: '#eab308',
  garbage: '#10b981',
  health: '#ef4444',
  safety: '#8b5cf6',
  jobs: '#0d9488',
  transport: '#06b6d4',
  housing: '#f97316',
};

/**
 * 5-step severity scale used by the UI dots. The domain enum is
 * low | medium | high | critical; the 5-dot UI maps medium→3 and critical→4&5.
 */
export const severityScale = [
  { step: 1, label: 'Very Low', color: '#10b981' },
  { step: 2, label: 'Low', color: '#84cc16' },
  { step: 3, label: 'Moderate', color: '#f59e0b' },
  { step: 4, label: 'High', color: '#f97316' },
  { step: 5, label: 'Very High', color: '#ef4444' },
] as const;

/** Maps the domain severity enum onto the 5-step scale + its color. */
export const severityToScale: Record<IssueSeverity, { step: number; color: string }> = {
  low: { step: 2, color: '#84cc16' },
  medium: { step: 3, color: '#f59e0b' },
  high: { step: 4, color: '#f97316' },
  critical: { step: 5, color: '#ef4444' },
};

/** Promise / delivery status → color (always pair with a text label, never color-only). */
export const statusColor: Record<PromiseStatus, string> = {
  draft: '#f97316',
  published: '#3b82f6',
  adopted: '#3b82f6',
  on_track: '#3b82f6',
  completed: '#10b981',
  delayed: '#f59e0b',
  disputed: '#ef4444',
  deferred: '#64748b',
  rejected: '#b91c1c',
  no_update: '#94a3b8',
};

export const tokens = {
  palette,
  slate,
  spacing,
  radius,
  typography,
  categoryColor,
  severityScale,
  severityToScale,
  statusColor,
} as const;

export type Tokens = typeof tokens;

/**
 * Sovereignty configuration for India Sovereignty Mode.
 * When mode is 'sovereign', non-resident managed services are disabled and
 * the OIDC, Valkey/BullMQ, Postgres, and S3-compatible ports must resolve to
 * India-hosted infrastructure. Demo auth and in-process jobs are development
 * fallbacks only; they are never a sovereign production runtime.
 */
export const SovereigntyConfigSchema = z.object({
  mode: z.enum(['managed', 'sovereign']).default('managed'),
  identityProvider: z.literal('oidc').default('oidc'),
  jobProvider: z.literal('bullmq').default('bullmq'),
  storageProvider: z.enum(['s3', 'minio']).default('minio'),
  requireIndiaRegion: z.boolean().default(true),
});

export type SovereigntyConfig = z.infer<typeof SovereigntyConfigSchema>;
