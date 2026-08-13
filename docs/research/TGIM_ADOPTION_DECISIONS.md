# TGIM adoption decisions

**Decision status:** proposed implementation baseline, reviewed 1 August 2026.

This document turns the [civic](CIVIC_ACCOUNTABILITY_PRODUCTS.md), [field/offline](FIELD_AND_OFFLINE_PRODUCTS.md), and [control-plane](CONTROL_PLANE_PRODUCTS.md) studies into a delivery contract. It is based on the current local checkout, including uncommitted work. It does not prove deployed behavior, provider connectivity, or device behavior.

## Outcome to protect

TGIM may call itself accountable only when the following chain is true:

```text
private citizen report
  -> privacy-projected, reviewable issue cluster
  -> human-approved manifesto revision
  -> scoped party adoption and delivery claims
  -> evidence-backed, challengeable public tracker
```

Five invariants govern every decision below:

1. **Public is a projection.** Public queries never start from raw reports or raw disputes and then remove a few keys.
2. **Authentication is not authority.** Every mutation is authorized against an active organization/area grant held by the server.
3. **A decision changes state.** Moderation, publishing, routing, and dispute resolution each make a durable domain transition and an audit entry.
4. **Queued is not accepted.** Only a server receipt proves that a report, verification, or external submission was accepted.
5. **Integration state is evidence-based.** Configuration, a dispatch attempt, provider acceptance, and completed delivery are different states.

## Current evidence and disposition

| ID | Current source evidence | Decision | Release impact |
| --- | --- | --- | --- |
| D1 | The in-memory issue path in `db.service.ts` returns submitted coordinates for `privacy === 'public'`; public DTOs return public coordinates. | Make privacy projection a write-time invariant and query from a public projection only. | Stop-ship |
| D2 | `GET /api/v1/manifesto/:areaId` calls `findLatest`; the public aggregate can reveal a draft. | Drafts are operator-only. Public queries use published revisions only. | Stop-ship |
| D3 | `POST /api/v1/moderation/actions` writes a moderation action/audit but does not alter issue visibility; public queries do not exclude hidden content. | Introduce explicit visibility state and an atomic moderation command. | Stop-ship |
| D4 | `GET /api/v1/disputes` is unauthenticated and returns the internal dispute shape, including `raised_by`. | Separate internal case and public accountability DTOs. | Stop-ship |
| D5 | `QStashJobPublisher.dispatch()` creates a new outbox event through `publish()`; webhook payloads do not satisfy typed worker job handlers. | One durable outbox row, one versioned envelope, idempotent dispatch/consume. | Stop-ship for managed async work |
| D6 | Mobile draft and verification queues use plaintext AsyncStorage; retries do not carry a server-enforced operation identity. | Use protected local persistence and a receipt-based idempotent operation contract. | Stop-ship before advertising offline support |
| D7 | Party membership is checked for some actions, but area/authority ownership is not a universal API policy; mobile demo role can differ from server capability. | Add server-owned scope grants and derive client capabilities from the authenticated API. | Stop-ship for multi-organization operation |
| D8 | Routing, authorization, persistence, public projection, and jobs remain concentrated in `app.ts` and `db.service.ts`; route validation/errors vary. | Refactor behind stable API routes into domain plugins, policies, repositories, DTOs, and job contracts. | Required before broad feature expansion |
| D9 | CORS reflects origins and rate limiting is process-local; provider setup is not evidence of provider health. | Add deployment-aware security and an operations evidence surface. | Required before public production release |

`Stop-ship` means the affected claim must not be made or exposed publicly until the stated acceptance test passes. It does not mean every later roadmap item blocks a private prototype.

## Decision register

### D1 — One public-data projection boundary

**Decision.** Keep raw report data (`reporter_id`, exact point, raw media/evidence, private notes) in internal models. At report creation, derive a generalized public location independently of the chosen privacy level. Public routes return only `PublicIssue`, `PublicCluster`, `PublicManifesto`, `PublicPromise`, and `PublicDispute` DTOs from a single projection module.

**Required rules.**

- Public coordinates use a documented generalized-cell/centroid policy, never the exact submission point. If a safe public point cannot be derived, the public value is absent rather than exact.
- Public media is an explicitly approved derivative/reference; raw evidence remains internal.
- The public aggregate is calculated from published/public records only. It must not expose counts or booleans that reveal draft existence or hidden moderation state.
- Prisma and in-memory stores must apply the same write and query policy. The in-memory mode is a test implementation, not a privacy exception.

**Owner:** API domain and data layer. **Done when:** route-contract tests prove every public response is safe in both persistence implementations, including adversarial input with exact coordinates, reporter IDs, and draft records.

### D2 — Immutable publication, not latest-record lookup

**Decision.** A manifesto has a mutable draft lifecycle and a separately addressable published revision. Publishing freezes the revision's promises/source clusters and records `published_at`, `published_by`, and the revision it supersedes. Editing begins a new draft revision; it never mutates a published result.

**Required rules.**

- Replace public use of `findLatest(areaId)` with `findLatestPublished(areaId)` (or a published-revision query) everywhere, including aggregates and exports.
- The existing legacy manifesto endpoint becomes operator-authenticated or is changed to published-only; it cannot remain an unauthenticated draft bypass.
- A publication action requires a scoped party/platform authority and a human confirmation. AI generation creates drafts only.

**Owner:** API policy and party workflow. **Done when:** a generated draft cannot be fetched or inferred anonymously; a published revision remains byte-for-byte stable after a subsequent draft is edited.

### D3 — Moderation as a state transition

**Decision.** Add `visibility` independently of issue/cluster workflow status. Allowed values are `internal`, `public`, and `hidden`; only the moderation service may make `public <-> hidden` changes. Workflow status continues to describe the report/cluster process (`open`, `clustered`, etc.), not audience eligibility.

**Moderation command contract.**

```text
target_type, target_id, requested_visibility, reason_code, reason_text,
evidence_ids[], expected_updated_at
```

The service loads the target, verifies moderator scope, checks optimistic concurrency, writes the visibility change and immutable moderation action in one transaction, and writes an audit event with old/new visibility. It returns a redacted moderation receipt.

**Owner:** API moderation domain. **Done when:** hiding removes an item from every public list/detail/aggregate query; unhide restores it only if its other publication criteria are met; history, reason, and actor survive retry/replay.

### D4 — Internal dispute case versus public outcome

**Decision.** `DeliveryDispute` is an internal case. Public tracker views receive a `PublicDisputeOutcome` only after a moderator resolves/publicizes it. The public DTO contains the promise ID, outcome/status, public rationale, evidence references approved for public view, and dates. It excludes `raised_by`, private reason detail, private evidence URLs, and resolver identity unless explicit policy permits disclosure.

**Required routes.**

- Internal list/detail and resolve routes require a moderator/platform-admin scope and enforce promise/organization scope.
- A public promise tracker endpoint may include published outcomes only; it must not reuse the internal list query.
- Dispute creation returns a private receipt to its author; creators can view their own case but not other citizens' cases.

**Owner:** API delivery/dispute domain and public tracker UI. **Done when:** anonymous and unrelated users cannot enumerate disputes or infer authors; a moderator can resolve and selectively publish an outcome with a complete audit trail.

### D5 — Typed, idempotent outbox and worker execution

**Decision.** Make the durable outbox the source of dispatch truth. `publish()` creates exactly one event inside the business transaction; `dispatch()` claims and sends that existing row; the consumer deduplicates by `event_id`. No dispatcher path creates another outbox row for the same event.

**Envelope.**

```json
{
  "event_id": "uuid",
  "event_type": "manifesto.generate",
  "schema_version": 1,
  "occurred_at": "ISO-8601 timestamp",
  "data": { "area_id": "uuid", "actor_id": "uuid" }
}
```

`event_type` has a central union/registry. Each entry defines its schema, worker handler, retry category, and idempotency key. The QStash message body is this envelope (or only `event_id` where the worker re-loads the envelope); it is never an untyped `{ entity_id }` shortcut.

**Dispatch states.** `pending -> claimed -> dispatched -> acknowledged` or `retryable_error -> pending`; non-retryable failures end as `failed`. Claim leases, attempt counts, and provider message IDs are persisted. A signed webhook validates its signature before loading the event.

**Owner:** API jobs/outbox domain. **Done when:** duplicate dispatch, webhook retry, worker crash after side effect, bad signature, and each registered event type have deterministic tested behavior in both sovereign and QStash modes.

### D6 — Protected mobile operation queue

**Decision.** Replace plaintext `draftQueue` and `verificationQueue` storage with a protected local database/storage adapter. The adapter stores no Clerk secret/session state and keeps full evidence bytes out of generic key-value storage. Media is a protected file reference with checksum, MIME type, and upload state.

**Operation record.**

```text
operation_id, type, payload_version, payload, evidence_refs[], state,
attempt_count, next_attempt_at, last_safe_error, server_receipt, created_at,
updated_at
```

The same `operation_id` is the API idempotency key. The API stores the request fingerprint and canonical receipt so a replay is safe. State values are exactly `local_draft`, `queued`, `submitting`, `accepted`, `retryable_error`, `needs_attention`, and `discarded`.

**Required behavior.** A report is only `accepted` after the server returns a canonical issue ID and receipt. 401/403/422 goes to `needs_attention`; timeout/network/429/5xx goes to `retryable_error` with bounded backoff; a user can inspect and discard an unsent operation. Verification uses the same contract and a server-side uniqueness constraint to prevent duplicate scoring.

**Owner:** mobile field workflow and API issue/verification domains. **Done when:** the six scenarios in the [field study](FIELD_AND_OFFLINE_PRODUCTS.md#acceptance-scenarios-before-calling-tgim-offline-ready) pass on physical supported devices as well as API tests.

### D7 — Scope grants as the authorization source of truth

**Decision.** Introduce a generic, time-bounded `ActorScopeGrant` owned by the API. It relates an actor to a `scope_type` (`platform`, `party`, `authority`, `department`, `area`, `research_institution`), a scope ID, role/capability set, issuer, starts/ends times, and revocation metadata. Existing party membership may become one grant source, but it is not a sufficient universal authorization model.

**Policy contract.** Every mutation declares required capabilities and required resource scope. The API loads the resource first, resolves its party/authority/area, and evaluates only active grants. Client role selections are presentational and never supplied as authority. Server capability summaries may be returned after authentication for UX gating.

**Owner:** API authorization domain. **Done when:** a grant revocation immediately blocks the API; cross-party, cross-area, and cross-authority access all fail; every allowed mutation emits the effective grant ID in its audit payload.

### D8 — Refactor by domain boundary, preserve routes

**Decision.** Keep the current `/api/v1` URLs while moving implementation into Fastify plugins by domain: `issues`, `public`, `manifestos`, `party`, `delivery`, `moderation`, `operations`, and `jobs`. Each domain has route schemas, policy functions, repository methods, DTO/projection functions, and tests. Cross-domain writes occur through explicit application services/transactions.

**Error contract.** Every non-2xx API response uses `{ error: { code, message, request_id, details? } }`; `details` is validation-safe and never exposes secrets, stack traces, raw evidence, or internal actor data. Route response schemas validate/redact successful responses too.

**Owner:** API platform. **Done when:** existing web/mobile consumers pass contract tests unchanged, no route relies on ad hoc header role casting for authorization, and error/request IDs can be traced to audit/job logs.

### D9 — Operations evidence and production security

**Decision.** Deployment secrets remain runtime-only. Operator-configurable routing and provider policy are versioned records. Each integration reports `disabled`, `configured`, `verifying`, `healthy`, `degraded`, or `failed`; only a completed probe/delivery can establish `healthy`.

**Required controls.** Allowlist CORS origins by environment, configure trusted proxy behavior explicitly, use shared/edge rate-limit state, restrict public webhook routes to signature-verified requests, and redact provider payloads from logs/audits. The operations console shows provider health, queue backlog, oldest pending event, failed dispatches, and audit history without exposing private reports.

**Owner:** platform operations. **Done when:** an authenticated operator can prove each configured provider's current state; a deployment smoke run verifies migration, API health, public DTO, role denial, worker execution, and web-to-API behavior separately.

## Dependency-ordered delivery

| Milestone | Includes | Must finish before |
| --- | --- | --- |
| M1: private/public safety | D1, D2, D3, D4 | any public launch or public data export |
| M2: authoritative mutation safety | D7 plus D3/D4 policy enforcement | external authority actions and party/officer rollout |
| M3: durable async work | D5 | enabling managed QStash workflows or promising automated routing/notifications |
| M4: truthful field operation | D6 | claiming offline report/verification support |
| M5: maintainable API | D8 | adding broad new products/integrations |
| M6: operating service | D9 | production launch |

M1 and the data-model work for M2 can proceed together. Do not begin M3 or M4 by adding another queue or screen; first establish the shared operation/event contracts. D8 can be incrementally performed behind M1–M4, but every moved domain must retain its contract tests.

## Release evidence matrix

| Claim | Evidence required | Insufficient evidence |
| --- | --- | --- |
| Public tracker is privacy safe | automated DTO/property tests in Prisma and in-memory modes; authenticated public-browser smoke | a build, a redacted component, or a single happy-path API response |
| Moderation works | visibility transition + public query change + audit verification | a row in `moderation_actions` only |
| Promise/publication is accountable | draft/published revision tests, scoped publisher denial, immutable prior revision | AI generation or a publish button existing |
| External routing/notifications work | signed provider receipt/webhook, persisted provider result, retry/failure path | environment variables or a queued job |
| Offline works | Android/iOS physical-device evidence for restart, retry, idempotency, attachment, and rejection cases | AsyncStorage persistence or emulator-only happy path |
| Production is ready | live migration/status, CORS/rate-limit checks, authenticated role flow, provider probes, worker run, and web/API smoke | local tests or a green static build |

## Explicit non-decisions

This baseline does not authorize importing a reference product; switching TGIM's Fastify/React/Expo stack; ingesting social-media reports; adding participatory budgets/elections; exposing real-time volunteer location; or giving a settings UI authority over secrets, public-location precision, or audit retention. Those need separate product, legal, and operational decisions after M1–M6.
