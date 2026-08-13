# M1-M6 implementation and release evidence

**Last local verification:** 2026-08-13. This is deliberately an evidence
ledger, not a claim that provider-backed production is live. A row marked
`external UAT required` blocks the corresponding production-release gate.

| Gate | Implemented contract | Local evidence | Production evidence still required |
| --- | --- | --- | --- |
| M1 | `visibility` is distinct from workflow status; public reads use projection functions; manifesto publication stores publisher/time; published dispute outcomes are explicit. | API projection/hide-restore/revision tests pass. | Browser smoke over deployed public, export, aggregate, and MCP surfaces; Prisma-backed adversarial DTO run. |
| M2 | Time-bounded/revocable actor scope grants govern party and authority actions; production OIDC checks issuer, signature, expiry, audience, and subject. | API revoked-grant denial test passes; generic OIDC verifier and Keycloak-ready clients compile. | Signed Keycloak JWT UAT for each pilot tenant, including cross-party/authority/area and expiry cases. |
| M3 | Typed versioned outbox envelope is created before BullMQ dispatch; only opaque event IDs enter Valkey; consumers revalidate event type/payload; queue view is redacted. | API tests prove pending authority/notification events and contract build passes. | Production Valkey duplicate/retry/crash/DLQ exercise and worker receipt. No automatic submission may be advertised before this. |
| M4 | Report and verification operations use chunked Expo SecureStore; evidence is copied to app-private files and only read as Base64 at upload time; state machine is explicit. | Mobile typecheck passes and source contains no queued Base64 evidence. | Android/iOS physical-device interruption, attachment, duplicate, 401/403/422, 429, and eventual-receipt run. |
| M5 | Shared schemas, public projections, typed job contract, scope policy, and redacted error/operations paths are in place while existing URLs remain stable. | Shared/API/web/mobile builds and lint pass. | Prisma contract suite and incremental Fastify domain-module extraction review. |
| M6 | Production CORS fails closed without an allowlist; production `/ready` rejects the in-memory fallback; MCP OAuth is per-request; operator status reports redacted provider/queue state. | API tests, builds, and lint pass; schema validates. | Migration, deployed `/ready`, edge/distributed rate limiter, provider probes, MCP valid/invalid-token UAT, storage/email/Open311 sandbox delivery, and deployment smoke.

## Hard release rule

The code is **not authorised for public production release** until every
external-UAT item above has an owner, timestamp, environment, request ID or
provider receipt, and pass/fail result. In particular, configured environment
variables are not provider health, and a pending outbox record is not an
authority submission or notification delivery.

## Exact verification commands completed locally

```sh
pnpm --filter @tgim/api test
pnpm --filter @tgim/shared build
pnpm --filter @tgim/web build
pnpm --filter @tgim/mobile typecheck
pnpm lint
cd apps/api && DATABASE_URL=postgresql://tgim:tgim@127.0.0.1:5432/tgim pnpm exec prisma validate --schema prisma/schema.prisma
```

## Deployment handoff sequence

1. Apply all migrations through `202608130001_sovereign_full_platform` to a restored staging database.
2. Configure the runtime-only variables in `.env.example` for Keycloak/OIDC,
   MCP, Valkey, MinIO, SMTP, OpenProject, and the explicit CORS/API origins. Do
   not enter secrets in the admin UI.
3. Run the government MCP guide's valid and invalid bearer-token checks, then
   record the audit client ID and request IDs.
4. Complete an Open311 sandbox submission/poll with citizen recipient consent
   and a scoped officer grant; retain the returned authority request ID.
5. Run the mobile device matrix and production browser smoke. Only then mark
   the relevant gate as released in the launch record.
