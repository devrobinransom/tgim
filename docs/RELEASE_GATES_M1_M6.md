# TGIM M1-M6 release gates

This document is the release contract for the Mumbai pilot. A gate is complete
only when every implementation item and evidence item below has been recorded.
Green local tests are not a substitute for a live provider, device, or
deployment check.

## M1 — Private/public safety

**Outcome:** every unauthenticated response is a safe projection, and public
publication is deliberate, immutable, and independently auditable.

### Acceptance criteria

- Every public issue, cluster, manifesto, promise, aggregate, export, Open311,
  and MCP response is constructed by a public projection function. Exact
  coordinates, reporter identity, raw media URLs, idempotency keys, private
  notes, and internal actor IDs are absent by contract.
- Reports and clusters have an audience visibility state independent of their
  workflow status. A hide/restore action changes all relevant list, detail,
  aggregate, export, and MCP results atomically and writes one moderation and
  one audit event.
- A public point is always a derived/generalised point. The server never uses
  the submitted point as the public point, including for `privacy=public`.
- Manifesto publishing freezes a revision with publisher and timestamp. A new
  draft cannot mutate a published revision, and public reads select only a
  published revision.
- Delivery disputes are private cases by default. A public promise record may
  show only explicitly published outcome/rationale/evidence references and
  never the reporter, private reason, private evidence, or resolver identity.

### Required evidence

- Adversarial DTO tests run against in-memory and Prisma persistence.
- A public browser smoke confirms hidden records disappear from every public
  surface and a published revision remains unchanged after a new draft.
- An audit export shows the actor, old/new visibility, publication, and public
  dispute publication events without private payloads.

## M2 — Authoritative mutation safety

**Outcome:** roles authenticate identity, while time-bounded scope grants decide
what a person or organisation may do.

### Acceptance criteria

- Every privileged mutation declares a capability and resolves the target's
  platform, party, organisation, authority, department, or area scope before
  writing.
- Active grants include issuer, start/end time, capability set, revocation
  information, and an audit reference. Revocation is immediately effective.
- A party lead cannot alter another party's promises; an officer cannot alter a
  different authority/department case; a tenant admin can invite only into the
  tenant for which they hold an active admin grant.
- Keycloak/OIDC is identity-only. Production JWT verification
  checks signature, issuer, expiry, configured audience, and subject. Demo role
  headers are impossible in production.
- Every allowed privileged mutation records the effective grant ID; denials are
  tested for cross-party, cross-authority, cross-area, expired, and revoked
  grants.

### Required evidence

- API integration tests for all denial cases and a valid signed JWT test.
- Authenticated browser test using a non-demo account in the pilot tenant.

## M3 — Durable asynchronous work

**Outcome:** one accepted domain event has one durable, typed, replay-safe
execution path.

### Acceptance criteria

- Outbox rows contain a versioned event envelope and immutable event ID.
- Dispatch claims an existing row; it never creates another outbox row.
- Consumers reload and deduplicate the event by ID, persist attempts/provider
  receipt, and move failures through retryable and terminal states.
- BullMQ jobs contain only opaque outbox event IDs; consumers reload and verify
  the durable Postgres envelope before processing.
- Every registered worker type has schema validation and duplicate, crash,
  invalid-signature, retry, and dead-letter tests.

### Required evidence

- BullMQ duplicate, crash, retry, and dead-letter tests against production Valkey.
- Operations view shows queue backlog, oldest event, failures, and DLQ state.

## M4 — Truthful field operation

**Outcome:** mobile work survives interruption without overstating delivery.

### Acceptance criteria

- Offline-capable operations use protected storage and a stable operation ID.
- Generic key-value storage never contains evidence Base64, exact location,
  long-lived tokens, or accepted receipts.
- States are `local_draft`, `queued`, `submitting`, `accepted`,
  `retryable_error`, `needs_attention`, and `discarded`.
- API idempotency returns the original canonical receipt for a replay; 401/403/
  422 become `needs_attention`, while timeout/429/5xx use bounded retry.
- Users can see, retry, and discard queued work without a false success state.

### Required evidence

- Android and iOS physical-device runs cover restart, duplicate submit,
  attachment retry, authorization rejection, network failure, and eventual
  accepted receipt.

## M5 — Maintainable API

**Outcome:** routes retain stable URLs while domain policy, DTO, persistence,
and error behaviour are consistent and testable.

### Acceptance criteria

- Domain routes are separated into issues/public, manifesto/party, delivery,
  moderation, organisations, operations, and jobs modules or equivalent
  services with contract tests.
- Each non-2xx response follows `{ error: { code, message, request_id,
  details? } }`; no stack trace, secret, raw provider response, or private
  evidence leaks.
- Request validation uses shared schemas and successful public responses use
  explicit projections.
- In-memory and Prisma branches pass the same contract suite.

## M6 — Operating service

**Outcome:** a real deployment can prove its state without exposing secrets or
private civic evidence.

### Acceptance criteria

- CORS uses an environment allowlist, trusted-proxy behaviour is explicit, and
  rate limits use shared/edge state in production.
- Provider state is `disabled`, `configured`, `verifying`, `healthy`,
  `degraded`, or `failed`; only a successful probe/delivery is healthy.
- Operations endpoints are admin-scoped and show migration/readiness, provider
  health, queue backlog, oldest pending event, failed jobs, and redacted audit
  history.
- MCP is configured only through runtime secrets, verifies OAuth/OIDC per
  request, logs client identity, and has a valid/invalid token UAT record.
- A release run records migration, API health, public DTO, role denial, worker,
  web-to-API, storage, notification, Open311 sandbox, and MCP checks.

## Release rule

M1 and M2 must pass before any public launch or authority action. M3 must pass
before automatic routing or notification claims. M4 must pass before offline
claims. M5 and M6 must pass before a public production release.
