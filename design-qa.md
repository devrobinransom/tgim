# Public mockup alignment QA

Date: 2026-08-30

## Reference

- `docs/mocks/generated/public-share.png`
- `docs/mocks/generated/public-mobile.png`
- `mocks/Mock 8.png`

## Implemented alignment

- Public shell now uses a search/context header, live area identity, and compact public navigation.
- Search input is wired: controlled state, `?search=` query param, sync from URL, cleared via `Clear filters`.
- Public area pages use warm rounded cards, orange primary action hierarchy, map-first issue discovery, and category summary cards with `?category=` links.
- Mobile public pages expose Map, Problems (`#evidence` anchor), Manifesto, and Me shortcuts in a fixed bottom bar.
- Category and search filters are applied client-side to the public-safe issue list (`GeoMap` + evidence list) with clear-filters control.
- Existing privacy-safe map, evidence links, manifesto links, and participation CTA remain functional.

## Verification

- `pnpm --filter @tgim/web typecheck` — passed
- `pnpm --filter @tgim/web lint` — passed (shared build + api build also pass)
- `pnpm --filter @tgim/web build` — passed (Next 16.3 Turbopack, 8 routes, static + dynamic)
- `git diff --check -- apps/web` — passed
- Browser screenshot comparison — blocked in this environment: `pnpm dev:web` denied socket binding with `listen EPERM`; production build artifacts are available for static inspection.

Final result: implementation verified statically; visual parity requires browser-capable run in `apps/web` (desktop ≥1280px + mobile 390×844 vs references) before final sign-off.

Remaining QA action: run `pnpm dev:web` + `TGIM_IN_MEMORY=true pnpm dev:api` in browser environment, compare desktop/mobile public area pages against references, adjust spacing/breakpoint if needed.
