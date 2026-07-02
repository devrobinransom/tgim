"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokens = exports.statusColor = exports.severityToScale = exports.severityScale = exports.categoryColor = exports.typography = exports.radius = exports.spacing = exports.slate = exports.palette = void 0;
/**
 * TGIM design tokens — the single source of truth for the visual language,
 * extracted from docs/DESIGN.md (which mirrors apps/web/src/index.css :root).
 *
 * Both the web simulator and the mobile client consume these so the two
 * surfaces cannot drift apart. Plain data (no React/RN imports) so it is
 * safe to import from any package.
 */
exports.palette = {
    /** Brand orange — all primary interactive elements and active states. */
    accent: '#ff5200',
    /** Lighter orange — gradient top, link hover. */
    accentLight: '#ff7e29',
    /** Primary gradient stops (start → end), 135deg in CSS. */
    primaryGradient: ['#ff7e29', '#ff5200'],
    success: '#10b981',
    warning: '#eab308',
    danger: '#ef4444',
    info: '#3b82f6',
    bgMain: '#f8fafc',
    bgCard: 'rgba(255,255,255,0.95)',
    borderCard: 'rgba(15,23,42,0.08)',
};
/** Slate text/neutral ramp (used inline everywhere in the web sim). */
exports.slate = {
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
};
/** 8px-multiple spacing grid. */
exports.spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
};
/** Corner radii: 6–16 for cards/badges, 40 for the phone frame, pill = 9999. */
exports.radius = {
    sm: 6,
    md: 10,
    lg: 16,
    frame: 40,
    pill: 9999,
};
exports.typography = {
    fontFamily: 'Outfit',
    fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    weight: {
        body: '400',
        label: '600',
        heading: '700',
        emphasis: '800',
        logo: '900',
    },
};
/** Category → marker/badge color (docs/DESIGN.md "Category → color"). */
exports.categoryColor = {
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
exports.severityScale = [
    { step: 1, label: 'Very Low', color: '#10b981' },
    { step: 2, label: 'Low', color: '#84cc16' },
    { step: 3, label: 'Moderate', color: '#f59e0b' },
    { step: 4, label: 'High', color: '#f97316' },
    { step: 5, label: 'Very High', color: '#ef4444' },
];
/** Maps the domain severity enum onto the 5-step scale + its color. */
exports.severityToScale = {
    low: { step: 2, color: '#84cc16' },
    medium: { step: 3, color: '#f59e0b' },
    high: { step: 4, color: '#f97316' },
    critical: { step: 5, color: '#ef4444' },
};
/** Promise / delivery status → color (always pair with a text label, never color-only). */
exports.statusColor = {
    draft: '#f97316',
    published: '#3b82f6',
    adopted: '#3b82f6',
    on_track: '#3b82f6',
    completed: '#10b981',
    delayed: '#f59e0b',
    disputed: '#ef4444',
};
exports.tokens = {
    palette: exports.palette,
    slate: exports.slate,
    spacing: exports.spacing,
    radius: exports.radius,
    typography: exports.typography,
    categoryColor: exports.categoryColor,
    severityScale: exports.severityScale,
    severityToScale: exports.severityToScale,
    statusColor: exports.statusColor,
};
