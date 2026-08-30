# Contributing to TGIM

Thanks for your interest in TGIM — open, auditable civic infrastructure for India.

This document is the contributor contract. If you follow it, reviews are fast. If you don't, we will ask for changes before merging.

## Mission & Guardrails

TGIM turns **citizen evidence → verified cluster → manifesto promise → adopted party promise → tracked delivery** with public accountability.

Four non-negotiable guardrails apply to every contribution:

1. **Zero-Leak Privacy** — never expose exact lat/lng or user identity in a public response. Public reads must use `toPublic*` projections.
2. **Double-Entry Audit** — every mutation of an issue, cluster, promise, or delivery state writes to `audit_events`.
3. **No Placeholders** — no `TODO`, dummy functions, or stub screens in committed code.
4. **Validation Pipeline** — lint + typecheck + tests must pass before a task is closed.

If a change weakens any guardrail, it will not be merged, regardless of other merit.

## Code of Conduct

Be civic. Be direct. No harassment, no dehumanizing language, no political campaigning inside the repo. Focus on evidence, verification, and measurable delivery. Violations may result in moderation or a ban. For sensitive reports, see `SECURITY.md`.

## How to Contribute

### 1. Find or open an issue

- For bugs and small docs fixes, a PR with a clear description is enough.
- For new features, new routes, schema changes, or design-system changes, open an issue first and wait for a maintainer to label it `accepted`.

### 2. Set up local development

```sh
# Prerequisites: Node 22, pnpm 11, Docker (optional for Postgres/Valkey)

pnpm install

# In-memory walkthrough (no database required)
TGIM_IN_MEMORY=true pnpm dev:api        # Fastify on :3000
pnpm dev:web                             # Next.js on :3002 (proxies /api/bff → :3000)
pnpm dev:mobile                          # Expo

# With Postgres + PostGIS (Neon or local)
cp .env.example .env
# set DATABASE_URL, then:
pnpm --filter @tgim/api prisma:generate
pnpm --filter @tgim/api prisma:migrate
pnpm dev:api
```

`@tgim/shared` is the single source of truth for domain types, Zod schemas, and `calculatePriorityScore`. Both API and clients import from there — do not duplicate request schemas inline.

ESM rule: every package is `"type": "module"` with `NodeNext` resolution. Relative imports in `.ts` source **must** use the `.js` extension (e.g. `from './app.js'`). Omitting it breaks the build.

Dual-mode persistence: `apps/api/src/services/db.service.ts` branches on `DATABASE_URL`. Unset → `InMemoryDb` seeded store. Set → Prisma + PostGIS/pgvector via raw `$queryRawUnsafe`. **When adding a data operation, implement both branches.**

### 3. Branch and commit

- Fork and create a feature branch from `main`: `feat/<short-name>` or `fix/<short-name>`.
- Keep commits focused. Write a descriptive subject (< 72 chars) and explain the *why* in the body.
- No `Co-Authored-By` trailer unless the project explicitly wants it.

### 4. Verify before you push

```sh
pnpm verify
# is: shared build + api-client build + api build + api test (TGIM_IN_MEMORY=true)
#     + web build + mobile lint + mobile test + mobile typecheck

sh scripts/verify-sovereign.sh static   # sovereignty invariant scan
pnpm lint                                # eslint across workspaces
```

For a single package:

```sh
pnpm --filter @tgim/shared build && pnpm --filter @tgim/shared test
pnpm --filter @tgim/api build
pnpm --filter @tgim/api test             # runs with TGIM_IN_MEMORY=true
pnpm --filter @tgim/web build
pnpm --filter @tgim/mobile lint
pnpm --filter @tgim/mobile typecheck
pnpm --filter @tgim/mobile test
```

A PR that fails `pnpm verify` or `verify-sovereign.sh static` will not be reviewed.

### 5. Open a pull request

- Fill the PR template (if present). Link the issue.
- Describe the verification you ran and the output.
- Note any privacy, audit, or auth impact. If none, say so explicitly.
- Keep diffs surgical: change only what the issue requires. No drive-by refactors or formatting churn.

## Project Layout

```
tgim/
├── apps/
│   ├── api/        # Fastify + Prisma/PostGIS/pgvector — all routes in app.ts, data via db.service.ts
│   ├── web/        # Next.js App Router — public record + role workspaces (party/volunteer/officer/admin)
│   └── mobile/     # Expo Router — citizen/volunteer public app (Home/Explore/Report/Promises/You)
├── packages/
│   ├── shared/     # Domain types, Zod schemas, formulas — single source of truth
│   └── api-client/ # Typed fetch client (bearer + workspace headers)
├── infra/k8s/      # K3s manifests (base + overlays) — the only deployment target
├── docs/           # PRODUCT_PLANS.md, DESIGN.md, SOVEREIGN_RUNBOOK.md, release gates
└── mocks/          # Mock 1–8.png — canonical v1 visual language
```

## Design & Visual Source of Truth

- `mocks/Mock 1.png` … `Mock 8.png` define the intended v1 product surface.
- `docs/DESIGN.md` defines tokens, category/severity/status colors, reusable primitives, and the mock→screen mapping.
- `apps/web/src/index.css` `:root` is the canonical token source.

When building or reshaping UI, match the mocks for visual language and `MEMORY.md` / `docs/superpowers/specs/` for scope, geography, and roles. The build is Mumbai Suburban District, pincode-first (400049/400053/400054/400058/400064/400092) — do not copy mock geographies (Jaipur/New Delhi) as product data.

## API & Domain Conventions

- All routes under `/api/v1` (`apps/api/src/app.ts`), plus `GET /health` and `GET /ready`.
- Mutating routes validate the body with a Zod schema from `@tgim/shared` via `safeParse` and return `400` with `error.flatten()` on failure. Add new request shapes to `packages/shared/src/schemas.ts`.
- Role guards are server-owned. Changing a browser URL never changes identity. Demo role headers are local-only and rejected in sovereign production.
- Every privileged mutation writes an `audit_events` row with `actor_id`, `event_type`, `target_table`, `target_id`, and `payload`.

## Security & Privacy Reviews

Flag any PR touching `apps/api/src/auth.ts`, `apps/api/src/public-projection.ts`, `apps/api/prisma/schema.prisma`, `apps/mobile/src/**/report*`, or `infra/k8s` for a maintainer security review. See `SECURITY.md` for the full invariant list.

## Questions?

Open a GitHub Discussion or an issue labeled `question`. For sensitive matters, use the channel described in `SECURITY.md`.
