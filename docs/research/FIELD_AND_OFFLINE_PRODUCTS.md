# Field and offline products: ODK Central and Collect

## What ODK demonstrates

ODK is the strongest reference in this set for a system that must remain honest when connectivity is unreliable. It is not a civic-accountability product, but it is a mature example of separating a field client from the system of record.

**Observed server boundary.** [ODK Central](https://github.com/getodk/central/blob/96f7d5e34c9ffba83c3248939070e0b3521c3103/README.md) manages user accounts and permissions, stores form definitions, and accepts client downloads and submission uploads. Its umbrella repository packages the production stack as Docker Compose and explicitly points implementation work to separate [backend](https://github.com/getodk/central-backend/tree/1cc2c78a8b55cedb3fa8b59180f85f06790845d5) and frontend repositories. The backend separates `data`, `formats`, `http`, `model`, `resources`, `task`, `worker`, and `external` concerns.

**Observed client boundary.** [ODK Collect](https://github.com/getodk/collect/blob/ad5eb25a84b729e16fe53c480a0323873f8c3a83/README.md) is built for unreliable connectivity and power conditions. Its Android source has dedicated areas for [projects, form management, savepoints, database, storage, background work, location, and notifications](https://github.com/getodk/collect/tree/ad5eb25a84b729e16fe53c480a0323873f8c3a83/collect_app/src/main/java/org/odk/collect/android). That is evidence of a real local-work lifecycle rather than a screen that optimistically posts data when a button is tapped.

## TGIM offline contract

TGIM should use a durable client record for every report, verification, media upload, and retryable field action. The minimum state machine is:

```text
local_draft
  -> queued (a local operation exists, no server claim)
  -> submitting (one attempt in progress)
  -> accepted (server returned canonical id and receipt)
  -> retryable_error (network, timeout, 429, or 5xx)
  -> needs_attention (auth, validation, policy, or conflict failure)
  -> discarded (explicit user action only)
```

The user-visible result must use that terminology. `queued` is not submitted, and a client-generated identifier is not an official reference until the API has accepted it.

### Required implementation patterns

- Generate an immutable client operation ID and send it as an idempotency key for every offline-capable mutation. The API stores a request fingerprint and canonical result, returning the same result for a safe replay.
- Store the queue in encrypted native storage or a protected local database; do not put exact locations, evidence Base64, role state, or long-lived tokens in plaintext AsyncStorage. Store media as a file reference plus digest and upload state rather than duplicating large Base64 payloads.
- Separate local draft editing from irreversible `submit` intent. A user must be able to inspect, retry, remove, or correct each queued operation.
- Upload attachments through a resumable/part-aware flow where provider and file size require it; persist digest, MIME type, capture time, and purpose. The API must validate that finalization belongs to the same actor and report.
- Drive retries from connectivity and app lifecycle signals, with bounded exponential backoff and server-directed retry times. Never claim background sync exists unless a physical-device test proves it on the supported platform.
- Preserve an append-only operation log locally until accepted or explicitly discarded; it lets support distinguish an unsent report from a server rejection without exposing raw field data publicly.

## Server responsibilities

The API owns business acceptance. It validates the actor's current authorization, report location policy, category, evidence linkage, and idempotency key even if the mobile app had validated the draft earlier. It then returns a receipt with canonical IDs, accepted timestamp, and next allowed action. Background workers can cluster, score, notify, or externally route only after that acceptance transaction commits.

For a verification action, duplicate replays must not create extra verification events or alter score more than once. Use a natural uniqueness constraint such as `(assignment_id, verifier_id, decision_version)` or the accepted operation ID, according to the domain rule chosen for repeat verification.

## What not to adopt from ODK

- Do not adopt its form engine or Android-native stack merely to get offline behavior. TGIM is Expo/React Native and needs the contract above, not an XForms migration.
- Do not assume a mature field app's permissions map to civic roles. TGIM needs area-scoped volunteer approval, party ownership, and public privacy policies in addition to project/server access.
- Do not treat ODK's Docker Compose deployment as TGIM's deployment design. The useful lesson is explicit server/client/worker ownership, not the container choice.

## Acceptance scenarios before calling TGIM offline-ready

1. A report with photo and exact coordinates is saved locally while offline; no public API or UI can reveal it before server acceptance and projection.
2. Restarting the app preserves the operation and retry state without duplicating the image or silently submitting it.
3. Replaying the same operation twice yields one server-side issue and the same receipt.
4. A 401/403/422 moves the entry to `needs_attention` with a safe correction path; it does not retry forever.
5. A 429/5xx/network failure remains queued, displays that it was not delivered, and respects a later retry time.
6. An approved verification replay cannot create an additional verification event or alter a cluster score twice.
