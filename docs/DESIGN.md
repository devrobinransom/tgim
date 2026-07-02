# TGIM Design System & Visual Reference

This is the detailed design reference for TGIM. `CLAUDE.md` points here; keep that file lean and put visual detail here.

**Visual source of truth:** the 8 PNGs in `mocks/` (`Mock 1.png` … `Mock 8.png`) are the intended v1 product surface (the product spec calls them exactly that). When building or reshaping UI, match these. The implemented reference is the web simulator `apps/web/src/App.tsx` — a single ~1600-line phone-emulator that reproduces all 8 mocks with inline styles. Its `mockImages` array (around lines 50–59) already encodes each mock's label + a per-screen styling checklist.

> **Where the tokens live:** `apps/web/src/index.css` `:root` is the canonical token + class source. `apps/web/src/App.css` is mostly leftover Vite-template boilerplate (`.hero`, `#next-steps`, `#docs`, `.ticks`…) and is **not** part of the TGIM design language — ignore it.

---

## Design tokens (`apps/web/src/index.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--primary-gradient` | `linear-gradient(135deg, #ff7e29 0%, #ff5200 100%)` | Primary buttons, logo, hero text |
| `--accent-color` | `#ff5200` | Brand orange — all primary interactive elements, active states |
| (gradient start) | `#ff7e29` | Lighter orange — gradient top, link hover |
| `--success-color` | `#10b981` | Verified / completed / positive trend |
| `--warning-color` | `#eab308` | Warnings, roads category |
| `--danger-color` | `#ef4444` | Critical / rejected / disconnected |
| `--bg-main` | `#f8fafc` | App background |
| `--bg-card` | `rgba(255,255,255,0.95)` | Glass-panel fill |
| `--border-card` | `rgba(15,23,42,0.08)` | Default card border |

**Slate text/neutral ramp** (used inline everywhere): `#0f172a` (primary text/headings) → `#1e293b`/`#334155`/`#475569` (body) → `#64748b` (muted) → `#94a3b8`/`#cbd5e1` (dividers) → `#e2e8f0`/`#f1f5f9`/`#f8fafc` (fills). Body backdrop is `radial-gradient(circle at 50% 0%, #f1f5f9 0%, #cbd5e1 100%)`.

**Spacing:** 8px-multiple grid (gaps/padding range 4px–24px). **Radii:** 6–16px for cards/badges, 40px for the phone frame, `9999px` for pills.

---

## Category → color (`--cat-*` tokens)

| Category | Token color | `.glow-badge` text color |
|---|---|---|
| water | `#3b82f6` | `#2563eb` |
| roads | `#eab308` (also `#f97316` inline) | `#ea580c` |
| garbage | `#10b981` | `#059669` |
| health | `#ef4444` | `#dc2626` |
| safety | `#8b5cf6` | `#7c3aed` |
| jobs | `#10b981` (badge uses teal `#0d9488`/`#14b8a6`) | `#0d9488` |
| transport | `#06b6d4` | — |
| housing | `#f97316` | — |

## Severity 1–5 → color

`1 Very Low #10b981` → `2 Low #84cc16` → `3 Moderate #f59e0b` → `4 High #f97316` → `5 Very High #ef4444`. (Domain severity enum is `low | medium | high | critical`; the 5-dot UI maps `medium`→dot 3 and `critical`→dots 4 & 5.)

## Status → color

verified/completed `#10b981` · on-track `#3b82f6` · delayed `#f59e0b` · disputed/rejected `#ef4444` · draft `#f97316` · no-update `#64748b`.

> **Accessibility:** status is never color-only — always pair color with a text label and/or icon (this is a stated product requirement). Maintain adequate contrast and scalable text.

---

## Typography

- **Font:** `Outfit` (Google Fonts), system fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`. Loaded weights **300–800**; the logo uses 900 (synthetic bold).
- **Weights in practice:** 700–800 for headings/emphasis, 600 for labels, 400 body.
- **`TG•M` logo:** `TG` + orange dot (`8×8`, `#ff5200`) + `M`, each at `font-weight: 900`, `letter-spacing: 0.5px`, `#0f172a`. Tagline beneath: **"THE GREAT INDIAN MANIFESTO"**, `0.65rem`, uppercase, `letter-spacing: 2px`, weight 800, `#64748b`.

---

## Reusable UI primitives (classes in `index.css`)

| Class | What it is |
|---|---|
| `.phone-emulator` | iPhone-12-style frame: `390×844`, `12px solid #0f172a` border, `40px` radius, `#f8fafc` bg, soft shadow; flex column (status bar → scroll area → tab bar) |
| `.glass-panel` | Glassmorphic card: `rgba(255,255,255,0.95)` + `backdrop-filter: blur(12px)`, `16px` radius, subtle border that darkens on hover — used for the right-column Party Studio + Audit Log panels |
| `.emulator-card` | White content card, `16px` radius, orange-tinted border on hover |
| `.glow-badge` + `.glow-badge.<category>` | Pill status/category badge (`9999px` radius); category modifier sets tinted bg/text/border (see table above) |
| `.category-btn` / `.category-btn.active` | Icon-over-label category tile; active = orange border + `rgba(255,82,0,0.08)` fill |
| `.severity-circle` | `38px` circular severity selector, `2px` transparent border (colored when active) |
| `.priority-circle-container` | Wrapper for the circular priority-score gauge (the `86/100` ring in Mock 1) |
| `.sparkline-svg` | `60×24` inline trend sparkline for top-issues lists |
| `.dashboard-grid` | Page grid: 1 column, → `420px 1fr` at `≥1024px`, max-width `1400px` |
| `.tab-bar` / `.tab-item` / `.tab-item.active` | Bottom nav; active item = `#ff5200`, weight 700 |
| `.primary` (on `button`) | Orange-gradient CTA, white text, `rgba(255,82,0,0.35)` shadow, lifts `translateY(-1px)` on hover |
| `input/select/textarea` | `10px` radius, focus = orange border + `rgba(255,82,0,0.15)` ring |

---

## Mock → screen mapping (first-hand)

The web simulator's `activeTab` is `'map' | 'problems' | 'manifesto' | 'tracker' | 'me'`. Each mock maps to a screen:

| Mock | Screen (web tab) | Key elements |
|---|---|---|
| **Mock 1** | Problems → Issue Detail | "Verified Issue" badge, ID `#PRB-7F4A92`, **86/100** circular priority gauge; stats 1.8K Affected / 217 Confirmations / 12 Photos·Videos; inline tabs Summary·Evidence·Solution·Manifesto·Tracking; Problem Summary; Recent Evidence photo scroller; Submitted→Verified→Clustered timeline; actions Support 217 · Add Evidence · Suggest Fix · Add to Manifesto |
| **Mock 2** | Party Studio (right panel) | "Party Studio — Shape. Compare. Adopt."; stats 24 Citizen Issues / 36 Manifesto Ready / 1.8K Public Feedback / 6 Adopted; **Promise Diff**: Citizen Demand vs Party Version with a Differences list (Scope Reduced / Timeline Added / Owner Missing); "All Promises (36)" filter tabs (Adopted/Under Review/Needs Costing/Rejected); Publish Official Manifesto |
| **Mock 3** | Constituency Dashboard (map/area card) | "Ward 12 Dashboard"; stat cards 4,281 Citizen Inputs / 219 Verified Clusters / 78% Manifesto Readiness / 62 Delivery Score; Highest Priority Cluster ("Unsafe School Access Roads") with mini-map; Top Issues list with severity badges + sparklines; Generate Manifesto · View Promise Tracker |
| **Mock 4** | Onboarding | Hero "India's problems, mapped by its **people**"; role cards Citizen / Volunteer / Party·Candidate / Researcher / Just Exploring; language pills (English हिंदी मराठी தமிழ் বাংলা); location (Use My Location / Choose a Place); Start Exploring |
| **Mock 5** | Tracker | "Delivery Tracker"; status overview 24 Adopted / 12 Completed / 9 On Track / 8 Delayed / 3 No Update / 2 Disputed; featured promise "Repair School Approach Roads" with horizontal milestone timeline (Demand Raised→Verified→Adopted→Owner Assigned→Budget Verified→Work Started→Citizen Verified); Area Report Card category bars; Add Update · Verify Completion · Challenge Claim |
| **Mock 6** | Manifesto | "Ward 12 People's Manifesto" (Draft badge); time-horizon accordions 100-Day / 1-Year / 3-Year Transformation / 5-Year Vision, each promise with department owner + timeline + target metric/%; Invite Public Feedback · Publish Draft · Export PDF |
| **Mock 7** | Problems → Pin wizard | "Pin a Problem" Step N of 6; map preview with pin; 1 Location (Current / Drop pin / Blur) · 2 Category (8 icons) · 3 Describe (+ mic) · 4 Add media (Photo/Video) · 5 Severity 1–5 · 6 Suggested fix · 7 Privacy (Public/Anonymous/Blur); Submit Problem |
| **Mock 8** | Map dashboard | MapLibre-style map with city hotspot markers (Thane 23 / Navi Mumbai 37 / Pune 42 / Mumbai 128); top search bar; Layers + 2D/Map controls; floating Pin a Problem; bottom sheet "Mumbai South Central" with 4.8K / 128 / 72% / 8.6 stat cards + Top Issues sparklines; Generate Local Manifesto · View Problems |

### Mocks are aspirational — the build is Mumbai-pincode-locked
Do **not** copy mock content blindly. The mocks show varied geographies (Mock 2 = Jaipur AC-5, Mock 7 = New Delhi) and roles "Researcher / Just Exploring", while the build is locked to **Mumbai Suburban District** organized by **6-digit pincodes** (seed: 400049, 400053, 400054, 400058, 400064, 400092) and the web sim renders roles as **Officer / Explorer**.

- Treat the mocks as the source of truth for **visual language and layout**.
- Treat `MEMORY.md` and `docs/superpowers/specs/` as the source of truth for **scope, geography, roles, and data**.
