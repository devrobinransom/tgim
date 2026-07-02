# TGIM Sovereign Scalable Technical Architecture Design

## Scope

This document continues the TGIM planning work with a concrete technical architecture for:

- Next.js web application
- Expo React Native mobile application
- shadcn/ui web component system and shadcn-style mobile components
- Clerk authentication
- Neon Postgres with PostGIS and pgvector
- Upstash Redis and QStash
- OpenProject for manifesto/project tracking
- Data visualization, polling, forms, analytics, and public exports
- India-first sovereignty, privacy, and scale controls

The existing product frame remains pincode-first for Mumbai Suburban District, then expands to wards, constituencies, districts, states, and national dashboards.

## Existing Repo Context

Current workspace facts:

- `apps/api` exists with Fastify, Prisma, and early civic endpoints.
- `apps/web` currently exists as a Vite React app. Target architecture changes it to Next.js App Router.
- `packages/shared` contains shared domain types, Zod schemas, and scoring formulas.
- `.omg/state/blueprint.md` locks the immediate MVP to Mumbai Suburban pincodes.
- The original product architecture spec is at `docs/superpowers/specs/2026-05-21-tgim-v1-product-architecture-spec.md`.

## Architecture Recommendation

Use a modular monorepo with a sovereign-ready service boundary:

```text
apps/
  web/                Next.js App Router public site, dashboards, Party Studio, admin
  mobile/             Expo React Native citizen and volunteer app
  api/                Fastify domain API for mobile, workers, integrations
  workers/            QStash handlers and sovereign queue handlers
  openproject-sync/   TGIM promise <-> OpenProject work package sync
packages/
  shared/             Types, Zod schemas, formulas, permissions, event names
  db/                 Prisma schema, migrations, seed data
  ui-web/             shadcn/ui wrappers and TGIM web design tokens
  ui-mobile/          NativeWind and React Native Reusables wrappers
  config/             ESLint, TypeScript, Tailwind, environment contracts
infra/
  docker/             Local and sovereign deployment compose files
  k8s/                India-hosted production manifests
  openproject/        OpenProject configuration and custom field bootstrap
```

Next.js should not replace the domain API. Next.js is the web app and web backend-for-frontend. Fastify remains the shared API for Expo mobile, workers, OpenProject sync, and integrations.

## Architecture Options

### Option A: Managed Velocity Lane

Use Clerk, Neon, Upstash Redis/QStash, managed object storage, and hosted monitoring.

Best for:

- Fast MVP.
- Small team.
- Rapid iteration with AI coding agents.
- Launching the Mumbai pincode pilot.

Risks:

- Neon public docs list Singapore as the nearest APAC region, not India.
- QStash docs list EU and US regions for QStash, not India.
- Clerk is a managed auth dependency; hard India-only residency requires contractual review or replacement.

### Option B: Sovereign Control Lane

Self-host sensitive components in India:

- Postgres with PostGIS and pgvector on India-hosted cloud or Indian data center.
- Keycloak, Authentik, or SuperTokens instead of Clerk.
- Valkey/Redis plus BullMQ, Trigger.dev self-host, or Temporal instead of QStash for sensitive jobs.
- MinIO or India-resident S3-compatible storage.
- OpenProject, Superset/Metabase, and Formbricks/LimeSurvey self-hosted in India.

Best for:

- Strict data residency.
- Government, civic, or election-sensitive deployments.
- Reducing dependence on foreign SaaS.

Risks:

- More DevOps burden.
- Slower MVP.
- Requires operating backups, patches, security monitoring, queue durability, and incident response.

### Recommended Path

Use a hybrid architecture:

- Build MVP with Clerk, Neon, Upstash, and managed storage.
- Treat all managed services as replaceable ports behind interfaces.
- Keep personal data, exact locations, raw media metadata, and civic evidence out of external job payloads.
- Deploy all public and sensitive app workloads in India-hosted infrastructure wherever feasible.
- Move to the sovereign lane for any deployment where India-only processing is a hard requirement.

## Data Sovereignty Model

### Data Classes

| Class | Examples | Storage Rule | External Processing Rule |
| --- | --- | --- | --- |
| Public civic data | Published clusters, manifesto promises, public dashboard counts | May be cached and served publicly | Allowed if already public |
| Sensitive civic data | Exact report text before moderation, raw evidence, volunteer notes | India-resident primary store preferred | Do not send raw content to non-resident systems |
| Personal data | Name, phone, email, Clerk ID, device token | Minimize; store shadow identity in TGIM DB | Clerk only stores auth data needed for login |
| Exact location | Raw GPS, private point geometry | Encrypt or access-control in Postgres | Never send in QStash payloads or analytics tools |
| Media originals | Photos, videos, EXIF, hashes | Private object bucket; India-resident for sovereign lane | Process in India-hosted workers |
| AI prompts | Cluster summaries, promise drafts | Store prompt/version/audit metadata | Strip PII and exact coordinates before model calls |
| Analytics exports | Area aggregates, trend datasets | Derived views with privacy thresholds | Public only after aggregation and redaction |

### India Sovereignty Controls

- Choose India-hosted compute for API, workers, OpenProject, BI, tiles, object storage, and observability.
- Prefer provider regions in India for any primary sensitive data store.
- If Neon is used and no India region is available, classify it as a managed velocity choice, not a hard sovereignty choice.
- If QStash is used, payloads must contain only opaque IDs and non-sensitive event metadata.
- Keep all raw civic evidence, exact coordinates, and personal identities in TGIM-controlled stores.
- Use app-level redaction before AI, analytics, OpenProject, or webhook dispatch.
- Encrypt exact coordinates, device tokens, and raw media metadata with keys controlled by TGIM.
- Maintain DPDP-aligned privacy controls: clear notice, purpose limitation, consent/legitimate-use mapping, erasure workflows, breach response, and audit logs. This is an architecture control, not legal advice.

## Web Architecture: Next.js

### Role

The Next.js app owns:

- Public TGIM website.
- Public pincode, ward, constituency, and national dashboards.
- Public issue cluster and manifesto pages.
- Party Studio web app.
- Moderator/admin web console.
- Research data portal.
- OpenProject status bridge UI.

The web app should migrate from Vite to Next.js incrementally:

1. Convert `apps/web` to a Next.js App Router app.
2. Initially wrap the existing Vite-style app as a client-only route to reduce migration risk.
3. Move page-by-page into App Router routes and server components.
4. Keep sensitive writes in Fastify or authenticated Next.js server actions that call shared domain services.

### Route Groups

```text
apps/web/src/app/
  (public)/
    page.tsx
    india/page.tsx
    pincode/[code]/page.tsx
    clusters/[clusterId]/page.tsx
    manifestos/[manifestoId]/page.tsx
  (party)/
    party-studio/page.tsx
    party-studio/[areaId]/page.tsx
  (admin)/
    moderation/page.tsx
    verification/page.tsx
    operations/page.tsx
  (research)/
    data/page.tsx
    exports/page.tsx
  api/
    bff/[...path]/route.ts
    webhooks/clerk/route.ts
    webhooks/qstash/[job]/route.ts
```

### Backend-for-Frontend Policy

Next.js route handlers are allowed for:

- Clerk webhook intake.
- QStash webhook handlers that are web-specific.
- Public read aggregation where server rendering improves performance.
- Web-only form actions.
- Proxying web requests to Fastify after validation.

Next.js route handlers are not the source of truth for:

- Issue creation.
- Verification state transitions.
- Manifesto generation.
- Party adoption.
- Delivery status changes.
- OpenProject synchronization.

Those mutations belong to Fastify domain services, with shared validators and audit-event writes.

### Forms

Use two form layers:

- Web: shadcn/ui form components, React Hook Form, Zod, and Next.js Server Actions where the mutation is web-only.
- Cross-client: shared Zod schemas in `packages/shared` for all citizen, volunteer, manifesto, polling, and delivery forms.

Every form mutation must:

- Validate on server.
- Verify Clerk identity and TGIM role.
- Apply pincode/area authorization.
- Write an audit event.
- Return safe, typed errors.

### Web Data Fetching

- Public pages use server components and cached reads from materialized views.
- Frequently changing dashboard tiles use client-side polling through TanStack Query or SWR.
- User-specific pages should not use shared public caches.
- Public pages should use cache tags such as `area:400053`, `manifesto:<id>`, and `cluster:<id>`.
- Multi-instance deployments need shared cache coordination or conservative cache lifetimes.

### Web Components

Use shadcn/ui as copied source components, not a black-box dependency. Create TGIM wrappers:

- `TgimMetricCard`
- `TgimIssueCategoryBadge`
- `TgimPriorityScore`
- `TgimPromiseStatusBadge`
- `TgimPincodeSelector`
- `TgimEvidenceGallery`
- `TgimManifestoTimeline`
- `TgimDeliveryStepper`
- `TgimDataTable`

Use shadcn/ui patterns for:

- Sidebar dashboard shell.
- Cards.
- Tabs.
- Forms.
- Tables with TanStack Table.
- Charts.
- Dialogs and drawers.
- Command/search palette.
- Toasts.
- Accessibility-aware form messages.

## Mobile Architecture: Expo React Native

### Role

The Expo app owns field-first workflows:

- Citizen onboarding.
- Pincode/location selection.
- Pin a problem.
- Media capture.
- Offline report draft and retry.
- Evidence submission.
- Volunteer verification.
- Local dashboard browsing.
- Push notifications.
- Delivery verification and challenge flow.

### Component System

- Use NativeWind for styling.
- Use React Native Reusables and `@rn-primitives` for shadcn-style primitives.
- Keep a separate mobile component package rather than trying to reuse DOM shadcn/ui components.

### Offline and Field Mode

Mobile must be local-first for:

- Report drafts.
- Media upload queue.
- Verification drafts.
- Pending support votes.
- Delivery challenge drafts.

Use:

- SQLite for structured offline queues and drafts.
- MMKV for small preference/session cache.
- Idempotency keys on every mutation.
- Background retry when network returns.

### Maps

- Use MapLibre React Native.
- Use pincode polygon vector tiles for Mumbai pilot.
- Use PostGIS for pincode resolution and boundary queries.
- Never expose exact private locations on public map overlays.

## Auth Architecture: Clerk With TGIM Authorization

### Identity Boundary

Clerk authenticates users. TGIM authorizes civic actions.

Clerk should store:

- Auth identifiers.
- Login methods.
- Organization membership where useful.
- Minimal public profile fields.

TGIM Postgres should store:

- `clerk_user_id`
- TGIM role assignments.
- Pincode/area permissions.
- Volunteer verification status.
- Party/candidate organization mapping.
- Department permissions.
- Consent and privacy preferences.

### Organizations

Use Clerk organizations for:

- Party teams.
- Candidate teams.
- NGO/volunteer groups.
- Department teams.
- Research institutions.

Mirror organization membership into TGIM tables:

- `organizations`
- `organization_members`
- `organization_area_permissions`
- `party_profiles`
- `department_profiles`

Clerk roles can gate coarse access. TGIM permissions must gate civic mutations.

### Next.js Auth

- Use Clerk server helpers in Next.js server components, route handlers, and server actions.
- Protect route groups for Party Studio, admin, and research.
- Verify authorization inside every server action, even if the page is already protected.

### Expo Auth

- Use Clerk Expo SDK for native sign-in flows.
- Store tokens using secure storage.
- Pass session tokens to Fastify API.
- Mobile app should support public browsing without sign-in, but require sign-in for report submission, support, verification, party actions, and delivery updates.

### Fastify API Auth

Fastify should:

- Verify Clerk JWTs against Clerk JWKS.
- Resolve `clerk_user_id` to TGIM user.
- Enforce TGIM roles and area permissions.
- Use service accounts only for worker-to-API and OpenProject sync jobs.

### Webhooks

Clerk webhook handling should:

- Verify webhook signature.
- Sync user creation, update, deletion, organization membership, and role changes.
- Write audit events for identity/permission changes.
- Never treat webhook data alone as permission to mutate civic state.

### Sovereign Auth Exit Path

If Clerk cannot satisfy India-only residency or election-sensitive requirements, replace it with:

- Keycloak for enterprise/open standards.
- Authentik for self-hosted identity.
- SuperTokens for application-auth focused flows.

The rest of TGIM should only depend on an internal `IdentityProvider` interface.

## Data Architecture: Neon Postgres

### Primary Data Store

Neon Postgres is the managed velocity store for:

- Users and TGIM authorization shadow records.
- Pincodes and boundaries.
- Issues.
- Evidence metadata.
- Clusters.
- Verification events.
- Manifestos.
- Party promises.
- Delivery updates.
- Polls and forms.
- Audit events.
- Outbox events.

Use Postgres extensions:

- PostGIS for geography.
- pgvector for similarity, dedupe, and semantic clustering.
- pg_trgm for fuzzy search.
- pgcrypto where database-level crypto is suitable.

### Connection Policy

- API and workers use pooled connections for normal reads/writes.
- Migrations use direct connections.
- Long-lived analytics or ETL jobs use read replicas or restricted database roles.
- Public dashboards read from materialized views or cached API results.

### Schema Additions

Add these technical integration tables:

```text
auth_identities
organizations
organization_members
organization_area_permissions
pincodes
pincode_boundaries
forms
form_versions
form_questions
form_responses
polls
poll_options
poll_votes
outbox_events
job_runs
job_attempts
openproject_projects
openproject_work_packages
openproject_sync_events
dashboard_snapshots
public_export_jobs
data_access_grants
consent_records
privacy_requests
```

### Public API Serialization

All public serializers must exclude:

- Exact latitude and longitude.
- Reporter identity.
- Device token.
- Raw media location metadata.
- Internal volunteer notes.
- Admin moderation notes.
- AI prompts containing sensitive data.

Public map responses should return:

- Pincode centroid.
- Blurred sector point.
- Cluster polygon/heat zone.
- Aggregated counts.

### Scaling Postgres

Use:

- GIST indexes for geometry.
- HNSW or IVFFlat indexes for vectors once volume justifies it.
- Partial indexes for active public issues.
- Composite indexes by `pincode_code`, `category`, `status`, and `created_at`.
- Time partitioning for audit, events, votes, and delivery updates.
- Materialized views for high-read dashboards.
- Read replicas for BI and public dashboards.
- Archived cold media metadata outside hot OLTP tables.

## Async Architecture: Upstash Redis and QStash

### Role

Use Upstash Redis for:

- Rate limiting.
- Short-lived dedupe keys.
- Web dashboard cache.
- Locking low-risk background jobs.
- Session-independent non-sensitive counters.

Upstash Redis supports Mumbai (`ap-south-1`) for global database primary/read regions, so it can fit the India-hosted cache lane better than QStash.

Use QStash for:

- Media processing callbacks.
- Manifesto generation jobs.
- Cluster recompute.
- OpenProject sync.
- Notification fanout.
- Scheduled dashboard refresh.
- Export generation.

### QStash Payload Rule

QStash payloads must contain only:

- `event_id`
- `job_id`
- `entity_type`
- `entity_id`
- `requested_by`
- `attempt_context`

QStash payloads must not contain:

- Exact coordinates.
- Names, phone numbers, or email addresses.
- Raw report text.
- Raw media URLs if private.
- Volunteer private notes.

Workers fetch sensitive data from TGIM API/Postgres after verifying service identity.

### Job Reliability

Every job should have:

- Outbox event row.
- QStash message ID.
- Idempotency key.
- Attempt log.
- Signature verification on inbound webhook.
- Retry policy.
- Dead-letter handling.
- Manual replay endpoint for admins.

### Sovereign Queue Exit Path

For hard sovereignty, replace QStash with:

- BullMQ plus Valkey/Redis in India.
- Temporal self-hosted in India for durable long-running workflows.
- Trigger.dev self-hosted if the team wants a developer-friendly workflow layer.

The application should call an internal `JobPublisher` interface, not QStash directly from domain code.

## OpenProject Architecture

### Role

OpenProject is the public-accountability/project-management layer, not the TGIM system of record.

TGIM owns:

- Civic issue data.
- Manifesto generation.
- Party adoption.
- Promise versioning.
- Public delivery status.
- Audit records.

OpenProject owns:

- Operational work breakdown.
- Assignment.
- Milestones.
- Dependencies.
- Project plans.
- Internal or public project tracking views.

### Mapping

| TGIM | OpenProject |
| --- | --- |
| Pincode or constituency | Project or program |
| Manifesto | Version or project phase set |
| Manifesto promise | Parent work package |
| Delivery milestone | Child work package |
| Department owner | Assignee/responsible/custom field |
| Priority score | Priority/custom field |
| Source cluster IDs | Custom field or description links |
| Delivery status | Work package status |
| Evidence updates | Attachments/comments linked from TGIM |

### Custom Fields

Create OpenProject custom fields:

- `tgim_promise_id`
- `tgim_manifesto_id`
- `tgim_area_type`
- `tgim_pincode_code`
- `tgim_category`
- `tgim_priority_score`
- `tgim_source_cluster_count`
- `tgim_public_status`
- `tgim_delivery_score`
- `tgim_last_public_update_at`

### Sync Rules

- TGIM publishes adopted promises to OpenProject as work packages.
- OpenProject status changes sync back only after validation and role checks.
- Public TGIM delivery status updates remain governed by TGIM transition rules.
- OpenProject attachments and comments are not automatically public.
- Sync jobs write `openproject_sync_events` and `audit_events`.

### Sovereignty

Self-host OpenProject in India, using India-hosted Postgres and object storage. If hosted OpenProject is used, do not send sensitive evidence or private user data into it.

## Data Visualization Architecture

### In-App Visualizations

Use Next.js and shadcn/ui charts for:

- Area overview cards.
- Category trend lines.
- Manifesto readiness.
- Delivery tracker status.
- Priority cluster ranking.
- Party promise diff summaries.

Use:

- Recharts-compatible shadcn chart wrappers for standard charts.
- TanStack Table for sortable/filterable tables.
- MapLibre GL JS for web maps.
- MapLibre React Native for mobile maps.
- Deck.gl only where large-scale point/cloud visualization justifies it.

### BI and Research Layer

Deploy Apache Superset or Metabase for internal/research analytics:

- Superset for complex geospatial and SQL-heavy analytics.
- Metabase for simpler operational BI and embedded charts.

Both should connect to:

- Read replica or anonymized analytics database.
- Materialized views, not raw private tables.
- Aggregated pincode/ward/constituency snapshots.

### Public Exports

Public exports must enforce:

- Minimum aggregation thresholds.
- No exact coordinates.
- No reporter IDs.
- No raw evidence media.
- No private volunteer/admin notes.
- Data dictionary and methodology note.

## Polling and Forms Architecture

### Built-In TGIM Forms Engine

TGIM should own critical civic forms:

- Pin problem.
- Add evidence.
- Volunteer verification.
- Suggest fix.
- Public feedback on manifesto promises.
- Party clarification requests.
- Delivery progress update.
- Completion challenge.
- Pincode pulse polls.

Why built-in:

- The data is civic evidence.
- Responses affect scoring and manifesto generation.
- Audit, anti-abuse, privacy, and pincode constraints are domain-specific.

### Form Model

```text
forms
form_versions
form_questions
form_response_sessions
form_responses
polls
poll_options
poll_votes
poll_vote_receipts
```

### Poll Types

- Single-choice pulse poll.
- Ranked-choice priority poll.
- Likert sentiment poll.
- Budget allocation poll.
- Delivery satisfaction poll.
- Candidate/party promise feedback poll.

### Poll Integrity

- One vote per authenticated user per poll where identity is required.
- Anonymous polls use device, rate-limit, and fraud signals but must be marked lower confidence.
- Pincode-specific polls require pincode eligibility.
- Poll results show sample size and confidence/eligibility notes.
- Poll votes are separate from issue support counts.
- Never call a poll result a verified mandate.

### OSS Survey Tools

Use external OSS survey tools only for non-core surveys:

- Formbricks for product feedback and embedded surveys.
- LimeSurvey for research-heavy surveys.

For sovereign mode, self-host them in India and sync only consented, non-sensitive aggregate responses into TGIM.

## API Architecture

### Fastify Domain API Modules

```text
auth/
geography/
pincodes/
issues/
evidence/
verification/
clusters/
scoring/
manifestos/
party-studio/
delivery-tracker/
forms/
polls/
notifications/
exports/
openproject/
moderation/
admin/
audit/
jobs/
```

### API Rules

- All writes use shared Zod schemas.
- All sensitive writes require Clerk identity and TGIM authorization.
- All civic state changes write audit events.
- All async workflows originate from an outbox event.
- All public responses use safe serializers.
- Every mutation accepts or generates an idempotency key.

## Event and Job Model

Use the transactional outbox pattern:

1. Domain mutation writes main row.
2. Same transaction writes `audit_events`.
3. Same transaction writes `outbox_events`.
4. Publisher dispatches event to QStash or sovereign queue.
5. Worker handles event idempotently.
6. Worker writes `job_runs` and follow-up events.

Core event names:

```text
issue.created
issue.media_uploaded
issue.supported
cluster.recompute_requested
cluster.verified
manifesto.generation_requested
manifesto.generated
party_promise.adopted
party_manifesto.published
delivery.update_added
delivery.completion_verified
delivery.claim_challenged
poll.vote_cast
form.response_submitted
openproject.sync_requested
export.requested
```

## Notification Architecture

Channels:

- Expo push notifications.
- Email for party/admin/research workflows.
- SMS/WhatsApp later only for high-value civic notifications.
- In-app notification center.

Notification topics:

- Report status.
- Cluster verified.
- Manifesto generated.
- Promise adopted.
- Delivery delayed.
- Completion challenged.
- Poll opened.

Notifications must respect:

- User preferences.
- Language.
- Pincode/area subscription.
- Privacy settings.
- Rate limits.

## AI Architecture

AI should assist, not decide.

Use AI for:

- Issue summarization.
- Cluster title/summary.
- Duplicate explanation.
- Manifesto draft generation.
- Promise diff labeling.
- Public plain-language summaries.

Do not use AI for:

- Final verification status without human review.
- Hiding/removing civic content without moderator review.
- Deciding official party adoption.
- Declaring delivery complete.

Sovereign AI lane:

- Run open models through vLLM or Ollama on India-hosted GPU.
- Store embeddings in pgvector.
- Strip PII and exact locations before prompts.
- Store model, prompt version, source IDs, and reviewer status.

## Deployment Architecture

### Managed MVP Deployment

- Next.js: hosted Node runtime or Vercel if sovereignty is not strict.
- Fastify API: India-hosted container service preferred.
- Workers: QStash to Next.js/Fastify webhook handlers.
- DB: Neon Postgres, nearest acceptable region.
- Redis/cache: Upstash Redis Mumbai if selected as primary/read region.
- Storage: S3-compatible bucket, India region if possible.
- OpenProject: self-hosted India VM/container.
- BI: self-hosted Superset or Metabase in India.

### Sovereign Production Deployment

- Kubernetes or container platform in India.
- Next.js behind nginx/HAProxy reverse proxy.
- Fastify API stateless replicas.
- Postgres with PostGIS/pgvector primary and read replicas.
- Valkey/Redis and queue workers.
- MinIO or India-resident object storage.
- OpenProject, Superset/Metabase, Formbricks/LimeSurvey self-hosted.
- Prometheus, Grafana, Loki, OpenTelemetry collector.
- Vault or cloud KMS for encryption keys.

### Multi-Instance Next.js Notes

If self-hosting multiple Next.js instances:

- Use a reverse proxy in front of Next.js.
- Use a shared cache strategy or conservative cache invalidation.
- Configure stable deployment identifiers for rolling deploys.
- Avoid relying on local filesystem state.
- Treat Next.js route handlers as stateless.

## Security and Privacy Controls

- Clerk JWT verification on all protected API requests.
- TGIM role and area authorization on all civic actions.
- Audit event for every material mutation.
- Public serializer tests for every public API.
- Rate limits by user, device, IP, pincode, and action type.
- Abuse detection for support/vote bursts.
- Media malware scanning and EXIF stripping.
- Moderation queue for evidence and abusive text.
- Signed uploads with short expiry.
- Signed private media access for reviewers.
- Separate public and private object buckets.
- KMS-managed encryption for sensitive fields.
- DPDP-aligned privacy request workflow.
- Data retention rules by entity type.
- Breach-response runbook.

## Scalability Plan

### Phase 1: Mumbai Pincode Pilot

- Single API cluster.
- Neon or managed Postgres.
- Materialized pincode dashboards.
- QStash for async jobs.
- OpenProject self-hosted for delivery tracking.
- Superset/Metabase connected to views.

### Phase 2: Maharashtra Expansion

- Partition hot tables by time and geography.
- Add read replica for dashboards and BI.
- Add vector tile server for boundaries and heatmaps.
- Add dedicated workers per queue type.
- Add pincode/ward-level cache warming.

### Phase 3: India Scale

- Region-aware app deployments.
- Separate OLTP, analytics, and public export databases.
- CDN for static assets, tiles, public exports, and published manifesto PDFs.
- Dedicated moderation and trust pipelines.
- Event streaming or durable workflow engine for high-volume public events.
- Multi-tenant party/department organization controls.

### Phase 4: Hard Sovereign Scale

- Move identity, DB, queues, storage, AI, and analytics fully into India-hosted infrastructure.
- Use open standards for auth and events.
- Keep service interfaces compatible with managed lane to avoid rewrite.

## Requirement Additions

| Req ID | Requirement | Acceptance Criteria | Priority |
| --- | --- | --- | --- |
| T41 | Convert web app from Vite to Next.js App Router. | `apps/web` runs with `next dev`, `next build`, route groups, and existing public mock view preserved. | P0 |
| T42 | Add Clerk identity across web and mobile. | Next.js and Expo can sign in, Fastify verifies JWT, TGIM user shadow row is created. | P0 |
| T43 | Add organization and area permissions. | Party, volunteer, department, admin, and researcher roles are enforced by TGIM authorization tables. | P0 |
| T44 | Add QStash-backed job publisher. | A domain event dispatches to a signed handler and records job attempts. | P0 |
| T45 | Add sovereign job publisher interface. | QStash can be replaced with BullMQ/Temporal without changing domain services. | P1 |
| T46 | Add OpenProject sync. | Adopted promise creates or updates an OpenProject work package with TGIM mapping. | P1 |
| T47 | Add built-in forms engine. | Versioned forms validate responses and write audit events. | P0 |
| T48 | Add polling engine. | Pincode polls enforce vote rules and publish aggregate results only. | P1 |
| T49 | Add BI-safe materialized views. | Superset/Metabase can connect without raw private tables. | P1 |
| T50 | Add India sovereignty mode. | Config disables non-resident job payloads and supports India-hosted replacements. | P0 |

## Short AI-Coding Implementation Streams

### Stream A: Web Migration

1. Create Next.js app shell in `apps/web`.
2. Preserve existing Vite UI as client-only page.
3. Add route groups.
4. Add shadcn/ui config and TGIM wrappers.
5. Add public pincode dashboard route.
6. Add Party Studio route shell.
7. Add admin/moderation route shell.

### Stream B: Auth and Permissions

1. Add Clerk providers to Next.js.
2. Add Clerk provider to Expo.
3. Add Clerk JWT verification in Fastify.
4. Add TGIM auth shadow tables.
5. Add organization tables.
6. Add route/action guards.
7. Add Clerk webhook sync.

### Stream C: Data and Sovereignty

1. Add pincode schema refinements.
2. Add public/private serializers.
3. Add sensitive field encryption interface.
4. Add materialized dashboard views.
5. Add public export views.
6. Add DPDP-aligned privacy request tables.

### Stream D: Jobs and Workers

1. Add outbox tables.
2. Add `JobPublisher` interface.
3. Add QStash implementation.
4. Add QStash signature verification handlers.
5. Add job attempt logging.
6. Add DLQ admin view.
7. Add BullMQ/Temporal-compatible interface stub for sovereign mode.

### Stream E: OpenProject

1. Add OpenProject mapping tables.
2. Add OpenProject API client.
3. Add custom field bootstrap script.
4. Add promise-to-work-package sync.
5. Add work-package-to-delivery-update sync.
6. Add sync conflict handling.

### Stream F: Forms, Polls, and Visualization

1. Add forms schema.
2. Add form renderer web components.
3. Add mobile form renderer.
4. Add poll schema and vote rules.
5. Add pincode poll UI.
6. Add shadcn chart wrappers.
7. Add Superset/Metabase-safe views.

## Open Decisions

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Is Clerk acceptable for MVP? | Yes, with minimal PII and an exit interface. | Fast delivery, but not hard sovereignty. |
| Is Neon acceptable for MVP? | Yes if Singapore/selected region is acceptable. | Strong Postgres DX, but no India region in current public docs. |
| Is QStash acceptable for sensitive jobs? | No. Use only opaque IDs. | Current QStash regions are EU/US. |
| Should OpenProject be public system of record? | No. TGIM remains record of civic truth. | Prevents project-management edits from bypassing civic audit rules. |
| Should external survey tools own civic polls? | No. TGIM owns civic polls; OSS survey tools are optional for non-core feedback. | Polls affect trust and manifesto scoring. |
| Should Next.js replace Fastify? | No. Next.js is web BFF; Fastify is domain API. | Mobile and workers need stable non-web API. |

## Validation Checklist

- No sensitive payloads in QStash.
- Public serializers hide identity and exact coordinates.
- Every mutation writes `audit_events`.
- Clerk webhooks are verified.
- QStash webhooks are verified.
- OpenProject sync writes audit and sync event rows.
- Superset/Metabase use safe views only.
- Polling engine separates poll votes from issue supports.
- India-sovereign mode can disable Clerk/QStash/managed storage usage through config.
- Next.js deployment supports self-hosting behind reverse proxy.

## References Checked

- Next.js App Router migration from Vite: https://nextjs.org/docs/app/guides/migrating/from-vite
- Next.js backend-for-frontend route handlers and security notes: https://nextjs.org/docs/app/guides/backend-for-frontend
- Next.js self-hosting and multi-instance guidance: https://nextjs.org/docs/app/guides/self-hosting
- Next.js forms and Server Actions: https://nextjs.org/docs/app/guides/forms
- Clerk Expo native components: https://clerk.com/docs/reference/expo/native-components/overview
- Clerk webhook verification and sync: https://clerk.com/docs/guides/development/webhooks/syncing
- Neon regions: https://neon.com/docs/conceptual-guides/regions
- Upstash QStash regions: https://upstash.com/docs/qstash/howto/multi-region
- Upstash QStash DLQ: https://upstash.com/docs/qstash/features/dlq
- Upstash Redis global database regions: https://upstash.com/docs/redis/features/globaldatabase
- OpenProject work package API: https://www.openproject.org/docs/api/endpoints/work-packages/
- OpenProject work package custom fields: https://www.openproject.org/docs/user-guide/projects/project-settings/work-packages/
- Apache Superset: https://superset.apache.org/
- Metabase OSS: https://www.metabase.com/start/oss/
- Formbricks overview: https://formbricks.com/docs/overview/what-is-formbricks
- MeitY DPDP Rules 2025 page: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa

## Spec Self-Review

- Scope is aligned with the current pincode-first blueprint and the requested national-scale technical stack.
- Managed services are included, but sovereignty exceptions and exit paths are explicit.
- Next.js is positioned as web/BFF, while Fastify remains the shared domain API for mobile and workers.
- OpenProject is integrated without becoming the civic source of truth.
- Polling/forms are domain-owned where they affect manifesto scoring or public trust.
- No unresolved drafting markers remain.
