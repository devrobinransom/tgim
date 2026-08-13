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
export declare const palette: {
    /** Brand orange — all primary interactive elements and active states. */
    readonly accent: "#ff5200";
    /** Lighter orange — gradient top, link hover. */
    readonly accentLight: "#ff7e29";
    /** Primary gradient stops (start → end), 135deg in CSS. */
    readonly primaryGradient: readonly ["#ff7e29", "#ff5200"];
    readonly success: "#10b981";
    readonly warning: "#eab308";
    readonly danger: "#ef4444";
    readonly info: "#3b82f6";
    readonly bgMain: "#f8fafc";
    readonly bgCard: "rgba(255,255,255,0.95)";
    readonly borderCard: "rgba(15,23,42,0.08)";
};
/** Slate text/neutral ramp (used inline everywhere in the web sim). */
export declare const slate: {
    readonly 900: "#0f172a";
    readonly 800: "#1e293b";
    readonly 700: "#334155";
    readonly 600: "#475569";
    readonly 500: "#64748b";
    readonly 400: "#94a3b8";
    readonly 300: "#cbd5e1";
    readonly 200: "#e2e8f0";
    readonly 100: "#f1f5f9";
    readonly 50: "#f8fafc";
};
/** 8px-multiple spacing grid. */
export declare const spacing: {
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 24;
};
/** Corner radii: 6–16 for cards/badges, 40 for the phone frame, pill = 9999. */
export declare const radius: {
    readonly sm: 6;
    readonly md: 10;
    readonly lg: 16;
    readonly frame: 40;
    readonly pill: 9999;
};
export declare const typography: {
    readonly fontFamily: "Outfit";
    readonly fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    readonly weight: {
        readonly body: "400";
        readonly label: "600";
        readonly heading: "700";
        readonly emphasis: "800";
        readonly logo: "900";
    };
};
/** Category → marker/badge color (docs/DESIGN.md "Category → color"). */
export declare const categoryColor: Record<IssueCategory, string>;
/**
 * 5-step severity scale used by the UI dots. The domain enum is
 * low | medium | high | critical; the 5-dot UI maps medium→3 and critical→4&5.
 */
export declare const severityScale: readonly [{
    readonly step: 1;
    readonly label: "Very Low";
    readonly color: "#10b981";
}, {
    readonly step: 2;
    readonly label: "Low";
    readonly color: "#84cc16";
}, {
    readonly step: 3;
    readonly label: "Moderate";
    readonly color: "#f59e0b";
}, {
    readonly step: 4;
    readonly label: "High";
    readonly color: "#f97316";
}, {
    readonly step: 5;
    readonly label: "Very High";
    readonly color: "#ef4444";
}];
/** Maps the domain severity enum onto the 5-step scale + its color. */
export declare const severityToScale: Record<IssueSeverity, {
    step: number;
    color: string;
}>;
/** Promise / delivery status → color (always pair with a text label, never color-only). */
export declare const statusColor: Record<PromiseStatus, string>;
export declare const tokens: {
    readonly palette: {
        /** Brand orange — all primary interactive elements and active states. */
        readonly accent: "#ff5200";
        /** Lighter orange — gradient top, link hover. */
        readonly accentLight: "#ff7e29";
        /** Primary gradient stops (start → end), 135deg in CSS. */
        readonly primaryGradient: readonly ["#ff7e29", "#ff5200"];
        readonly success: "#10b981";
        readonly warning: "#eab308";
        readonly danger: "#ef4444";
        readonly info: "#3b82f6";
        readonly bgMain: "#f8fafc";
        readonly bgCard: "rgba(255,255,255,0.95)";
        readonly borderCard: "rgba(15,23,42,0.08)";
    };
    readonly slate: {
        readonly 900: "#0f172a";
        readonly 800: "#1e293b";
        readonly 700: "#334155";
        readonly 600: "#475569";
        readonly 500: "#64748b";
        readonly 400: "#94a3b8";
        readonly 300: "#cbd5e1";
        readonly 200: "#e2e8f0";
        readonly 100: "#f1f5f9";
        readonly 50: "#f8fafc";
    };
    readonly spacing: {
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 16;
        readonly xl: 24;
    };
    readonly radius: {
        readonly sm: 6;
        readonly md: 10;
        readonly lg: 16;
        readonly frame: 40;
        readonly pill: 9999;
    };
    readonly typography: {
        readonly fontFamily: "Outfit";
        readonly fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        readonly weight: {
            readonly body: "400";
            readonly label: "600";
            readonly heading: "700";
            readonly emphasis: "800";
            readonly logo: "900";
        };
    };
    readonly categoryColor: Record<IssueCategory, string>;
    readonly severityScale: readonly [{
        readonly step: 1;
        readonly label: "Very Low";
        readonly color: "#10b981";
    }, {
        readonly step: 2;
        readonly label: "Low";
        readonly color: "#84cc16";
    }, {
        readonly step: 3;
        readonly label: "Moderate";
        readonly color: "#f59e0b";
    }, {
        readonly step: 4;
        readonly label: "High";
        readonly color: "#f97316";
    }, {
        readonly step: 5;
        readonly label: "Very High";
        readonly color: "#ef4444";
    }];
    readonly severityToScale: Record<IssueSeverity, {
        step: number;
        color: string;
    }>;
    readonly statusColor: Record<PromiseStatus, string>;
};
export type Tokens = typeof tokens;
/**
 * Sovereignty configuration for India Sovereignty Mode.
 * When mode is 'sovereign', non-resident managed services are disabled and
 * the OIDC, Valkey/BullMQ, Postgres, and S3-compatible ports must resolve to
 * India-hosted infrastructure. Demo auth and in-process jobs are development
 * fallbacks only; they are never a sovereign production runtime.
 */
export declare const SovereigntyConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["managed", "sovereign"]>>;
    identityProvider: z.ZodDefault<z.ZodLiteral<"oidc">>;
    jobProvider: z.ZodDefault<z.ZodLiteral<"bullmq">>;
    storageProvider: z.ZodDefault<z.ZodEnum<["s3", "minio"]>>;
    requireIndiaRegion: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "managed" | "sovereign";
    identityProvider: "oidc";
    jobProvider: "bullmq";
    storageProvider: "s3" | "minio";
    requireIndiaRegion: boolean;
}, {
    mode?: "managed" | "sovereign" | undefined;
    identityProvider?: "oidc" | undefined;
    jobProvider?: "bullmq" | undefined;
    storageProvider?: "s3" | "minio" | undefined;
    requireIndiaRegion?: boolean | undefined;
}>;
export type SovereigntyConfig = z.infer<typeof SovereigntyConfigSchema>;
