# Sovereign completion ledger

Last source verification: 2026-08-13. This ledger supersedes hosted-provider
assumptions in older M1-M6 notes.

| Workstream | Implemented locally | Acceptance still outside the repository |
| --- | --- | --- |
| Identity | Generic OIDC verification, issuer/subject identity mapping, Keycloak-ready web BFF, Expo authorization-code PKCE and SecureStore | Keycloak realm, MFA, real web/mobile tokens, revocation UAT |
| Durable work | Versioned Postgres outbox, opaque BullMQ IDs, retry/backoff, graceful worker shutdown, operations readback | K3s Valkey retry/crash/DLQ exercise |
| Civic product | Versioned forms, five core form seeds, submissions, polls, area eligibility, result suppression | Real-OIDC browser/device journeys and product-owner content signoff |
| Accountability | Public-safe reporting views, pincode aggregates, OpenProject mapping/retry service | OpenProject custom fields and live create/update receipts |
| Web | Vite/React Router/Clerk removed; Next.js App Router standalone build and OIDC BFF | Deployed browser, accessibility, responsive and role-boundary smoke |
| Mobile | Clerk/AsyncStorage/push removed; OIDC PKCE, secure tokens/preferences, durable protected queues | Native dev-client builds and physical Android/iOS interruption matrix |
| Operations | K3s manifests, default-deny network policy, CNPG backup CR, MinIO, Keycloak, OpenProject, Metabase, GitOps root, CI/static sovereignty check | India VMs, internal registry, secrets, DNS/TLS, restore drill and observability |

## Current local gates

- `pnpm verify`: passing, including 22/22 API tests, shared/client builds,
  Next.js production build, and mobile typecheck.
- `pnpm lint`: passing across shared, API client, API, web, and mobile.
- Local browser proof: all five server-defined civic workflows rendered, a
  response returned a durable receipt, the public area record rendered, and no
  console errors were captured.
- `docker build` passes for the API and web production images; API health and
  web readiness contracts were exercised from the built containers.
- `kubectl kustomize infra/k8s/overlays/production`: renders successfully.
- `sh scripts/verify-sovereign.sh static`: passing.

The remaining work is not safely inferable from source: VM/provider authority,
secret material, DNS ownership, real accounts, physical devices, and production
change approval are required. Those are release blockers, not implementation
details to hide behind green builds.
