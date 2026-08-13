# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TGIM ("The Great Indian Manifesto" / "Thank God It's Monday") is a civic platform that turns geolocated citizen issue reports into clustered, volunteer-verified demands, then into AI-drafted "people's manifestos," adopted party promises, and tracked delivery progress. Target geography: Mumbai Suburban District, organized by 6-digit pincodes. See `MEMORY.md` and `docs/superpowers/specs/` for the product/architecture specs.

The data lifecycle is the core domain: **Issue → Cluster → VerificationEvent → Manifesto → ManifestoPromise → PartyPromise → DeliveryUpdate**, with an `AuditEvent` written at every state mutation.

## Ethos & guardrails

The mission is an **evidence → verified cluster → manifesto promise → adopted party promise → tracked delivery** loop — "India's problems, mapped by its people." Honor these principles in any change: evidence-first, privacy-by-design, human review for civic claims, offline-tolerant, mobile- and pincode-first (Mumbai Suburban District; seed pincodes 400049/400053/400054/400058/400064/400092). Depth in `docs/superpowers/specs/`.

Four hard guardrails (non-negotiable):
1. **Zero-Leak Privacy** — never expose exact lat/lng or user identity in public APIs; resolve to pincode / blurred geometry.
2. **Double-Entry Audit** — every mutation of an issue, cluster, promise, or delivery state writes to `audit_events`.
3. **No Placeholders** — no dummy functions or `TODO`s in committed code.
4. **Validation Pipeline** — lint + typecheck + tests must pass before any task is closed.

## Skills to use

- **`superpowers:brainstorming`** — before building any new feature or screen; the specs are detailed, align intent first.
- **`frontend-design:frontend-design`** — when building or reshaping UI; pair with `mocks/` + `docs/DESIGN.md` so output matches the established visual language.
- **`superpowers:test-driven-development` + `superpowers:verification-before-completion`** — the path to satisfying the **Validation Pipeline** guardrail.
- **`superpowers:systematic-debugging`** — for any bug, test failure, or unexpected behavior.
- **context7 MCP** (`resolve-library-id` → `query-docs`) — fetch current docs for Fastify, Prisma, React 19, and the planned Expo / React Native / NativeWind / MapLibre mobile stack.
- **`claude-api`** — when implementing real AI manifesto drafting (the `manifesto/generate` route is currently mocked; the spec wants AI-assisted, human-reviewed drafting with stored source IDs/model metadata).

## Visual source of truth

`mocks/Mock 1–8.png` are the canonical v1 UI surface. The web simulator's `mockImages` array in `apps/web/src/App.tsx` encodes each mock's label + styling checklist. Full design tokens, color conventions, reusable primitives, and the mock→screen mapping live in **`docs/DESIGN.md`** — read it before any UI work. The mocks are the source of truth for **visuals/layout**; `MEMORY.md` + specs are the source of truth for **scope/data** (the mocks show non-Mumbai geographies and extra roles that the build does not use).

## Monorepo layout

npm workspaces (`apps/*`, `packages/*`):

- **`packages/shared`** (`@tgim/shared`) — the single source of truth for domain types (`types.ts`), Zod request schemas (`schemas.ts`), and the `calculatePriorityScore` formula (`formulas.ts`). Both API and web import from here. Changes here ripple everywhere.
- **`apps/api`** (`@tgim/api`) — Fastify server. All routes live in one file, `src/app.ts`; all data access goes through `src/services/db.service.ts`.
- **`apps/web`** (`@tgim/web`) — Vite + React 19 dashboard. The entire UI is a single ~1600-line `src/App.tsx` with inline styles — a high-fidelity simulator of the planned mobile client, matching the mockups in `mocks/`. It polls the API every 4s and shows a connection badge.
- **`apps/mobile`** (`@tgim/mobile`) — Expo Router (React Native) consumer client. Five-tab IA: **Home · Explore · Report · Promises · You**. Specialist flows (verify/manifesto/participate/tracker) are hidden from the tab bar but stay route-resolvable for workspaces and deep links. Report uses a short 4-step wizard with optional voice-to-description via the server-side Sarvam AI proxy (`src/ai.ts`). QA lives in `src/*.test.ts` (jest-expo).

## Commands

Run from the repo root:

```bash
npm run dev:api          # Fastify dev server (tsx watch) on :3000
npm run dev:web          # Vite dev server (expects API at localhost:3000)
npm run build:api        # tsc compile of apps/api
npm test                 # runs `test` in every workspace (only shared has tests)
npm run lint             # runs `lint` in every workspace
```

Per-workspace (use `-w`, e.g. `npm run build -w apps/api`):

```bash
# packages/shared — the only package with tests (jest + ts-jest, ESM)
npm test -w packages/shared
npx jest -w packages/shared formulas.spec        # single file
npx jest -w packages/shared -t "clamp scores"    # single test by name

# apps/api — Prisma
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api
npm run prisma:studio -w apps/api
```

Note: only `apps/web` ships an ESLint flat config (`eslint.config.js`). `apps/api` and `packages/shared` have `lint` scripts but no config, so `npm run lint` across all workspaces is not currently green for those two.

## Critical conventions

- **ESM with explicit `.js` import extensions.** Every package is `"type": "module"` on `NodeNext` resolution. Relative imports in `.ts` source **must** use the `.js` extension (e.g. `import { buildApp } from './app.js'`, `import './types.js'`). Omitting it breaks the build. Jest mirrors this via a `moduleNameMapper` that strips `.js`.

- **Dual-mode persistence.** `db.service.ts` is gated on `process.env.DATABASE_URL`:
  - **Unset** → an in-memory seeded store (`InMemoryDb`) with fixed records and hardcoded IDs (`default-citizen-id`, `default-volunteer-id`, `ward-12-id`, etc.). The app runs fully without a database; the web UI labels this "In-Memory Simulation Fallback."
  - **Set** → Prisma against Postgres, using **raw `$queryRawUnsafe`** for `issues` because location columns are PostGIS `geometry(Point, 4326)` (`ST_SetSRID`/`ST_Point`/`ST_X`/`ST_Y`) and `description_embedding` is a pgvector column — these are `Unsupported(...)` in the Prisma schema and cannot go through the typed client.

  **When adding a data operation you must implement BOTH branches** in the relevant `dbService.*` method, or behavior diverges between dev and prod.

- **Privacy is a hard guardrail.** Issues store `exact_location` and a separate jittered `public_location` (~200m offset). Never return exact coordinates or reporter identity in public responses. The jitter logic lives in `issues.create` (both branches).

- **Audit every mutation.** Any route that changes an issue, cluster, promise, or delivery state must call `dbService.audit.log({ actor_id, event_type, target_table, target_id, payload })`. Follow the pattern already in each POST handler in `app.ts`.

- **Priority score.** `calculatePriorityScore` (in `@tgim/shared`) weights supports (log), report count (capped), severity, and verification status into 0–100. It is recomputed on issue creation and on each support, and the cluster score is updated afterward. Keep this logic in `shared` so both clients agree.

- **No real auth yet.** Routes hardcode actor IDs (`default-citizen-id`, `party-profile-1-id`, etc.). Role switching is a sandbox feature via `POST /api/v1/auth/role`.

- **Request validation.** Mutating routes validate the body with a Zod schema from `@tgim/shared` via `safeParse` and return `400` with `error.flatten()` on failure. Add new request shapes to `schemas.ts`, not inline.

## API surface

All under `/api/v1` (see `apps/api/src/app.ts`), plus `GET /health` which reports whether Prisma or the in-memory fallback is active. Groups: `auth/role`, `areas` (+ `/search`), `issues` (+ `/:id`, `/:id/support`), `verification`, `manifesto` (`/generate`, `/:areaId`), `party/promises` (+ `/adopt`), `tracker/updates` (+ `/:promiseId`), and `audit`.
