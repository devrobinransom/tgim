# TGIM web

Next.js App Router application for TGIM's public accountability records,
citizen participation, and role-specific workspaces.

Authentication uses an authorization-code PKCE flow against the sovereign OIDC
issuer. The browser never receives provider credentials: the Next.js BFF stores
access and refresh tokens in HttpOnly cookies and forwards authenticated calls
to `API_ORIGIN_INTERNAL`.

## Local development

From the repository root:

```sh
pnpm --filter @tgim/web dev
pnpm --filter @tgim/web lint
pnpm --filter @tgim/web build
```

For an in-memory local walkthrough, run the API with `TGIM_IN_MEMORY=true` and
set `NEXT_PUBLIC_DEMO_MODE=true`, `WEB_DEMO_MODE=true`, and
`API_ORIGIN_INTERNAL=http://127.0.0.1:3000` for the web process. Set
`WEB_DEMO_ROLE` to one of `citizen`, `volunteer`, `party_lead`,
`department_officer`, `platform_moderator`, or `platform_admin` to exercise a
specific workspace. The demo role is server-controlled; changing a browser URL
does not change identity. Demo mode is rejected by the production readiness
contract.

Web maps use MapLibre with OpenStreetMap geography. Local demo mode falls back
to the OSM-derived OpenFreeMap style. Set `NEXT_PUBLIC_MAP_STYLE_URL` in staging
and production to the TGIM-managed or contracted OSM vector-tile style; do not
use the donation-funded `tile.openstreetmap.org` service as an unbounded
production backend. Map attribution remains visible in every state.

Production configuration and release evidence requirements live in
`docs/SOVEREIGN_RUNBOOK.md`.
