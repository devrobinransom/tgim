# TGIM Product Plans

Last updated: 2026-07-11

TGIM is an evidence-to-accountability platform for Mumbai Suburban District. The product is split into a public Expo app and role-specific web portals backed by one API, one Postgres data model, one shared domain package, and one audit trail.

The core lifecycle is:

`Citizen Issue -> Issue Cluster -> Volunteer Verification -> Manifesto Promise -> Party Promise -> Delivery Update -> Public Tracker`

## Product System

### North Star

Turn local civic pain into verified, measurable, public commitments that citizens can track.

### Launch Geography

- District: Mumbai Suburban District, Maharashtra.
- Unit: 6-digit PIN codes.
- Seed pincodes: 400049, 400053, 400054, 400058, 400064, 400092.
- Early UI can still aggregate by ward/constituency where the current API seed data requires it, but the product language should move toward pincode-first discovery.

### Hard Product Rules

- Public surfaces never expose exact user coordinates, private identity, or original media metadata.
- Every meaningful mutation writes an audit event.
- AI-generated manifesto text must remain evidence-linked and human-reviewable.
- Mobile is public-facing: citizen and volunteer only.
- Party, officer, and admin workflows are web-only for MVP.
- The first real end-to-end milestone is issue-to-promise, not a generic civic map.

### Shared Success Metrics

- Median text-only report time under 90 seconds.
- 80% of high-priority launch-area clusters verified within 30 days.
- 100% of generated promises cite source clusters.
- 100% of issue, verification, promise, and delivery mutations have audit events.

- Zero public API responses leak exact coordinates or reporter identity.
- At least one complete issue-to-delivery demo path works from mobile + web.

### Experience Architecture

TGIM should feel like an operating system for civic evidence, not a feed, CRM, or generic dashboard. Each app should keep one primary job visible and make the next action obvious:

- Public app: report, verify, support, track.
- Party portal: review demand, adopt promises, prepare publication.
- Volunteer portal: decide whether a cluster is trustworthy.
- Officer portal: publish factual delivery updates.
- Admin portal: protect trust, roles, geography, and audit history.

The shared product language is concrete and civic: "issue", "cluster", "verification", "promise", "delivery", "audit". Avoid vague growth-product labels such as "engagement", "activation", or "campaign performance" in primary UI.

### Visualization Strategy

Analytical job: geography, ranking, status monitoring, timeline change, audit traceability, and evidence comparison.

Artifact families:

- Geospatial maps for issue location, pincode coverage, verification queue, and public-safe density.
- Ranked lists for top issues, verification priority, adopted promises, overdue delivery items, and moderation queues.
- Timelines for issue lifecycle, promise adoption, delivery updates, and audit history.
- Small multiples and compact bars for category mix, status mix, pincode coverage, and department delivery.
- Diff views for citizen demand vs party wording.
- Tables for admin and operational review where scanning and bulk action matter more than visual storytelling.

Encoding rules:

- Use direct labels and visible values; do not rely on hover-only discovery.
- Use color plus text/icon for status. Status must not be color-only.
- Use brand orange for primary action/focus, not for every chart mark.
- Keep neutral context in slate/gray, positive status in green, warnings in amber, disputes/rejections in red, and category colors consistent with shared tokens.
- Maps must clearly state whether marks are exact, blurred, aggregated, or schematic. Public maps use blurred or aggregated marks only.
- Every chart must expose last updated, filter scope, and data caveats where stale or incomplete data can affect interpretation.

State and interaction rules:

- Portal filters should be URL-backed where useful: area, pincode, status, category, time range, selected promise/cluster.
- Mobile interactions must support tap/focus alternatives for every hover detail.
- Empty states should explain what upstream event unlocks the view.
- Loading states should preserve layout where possible.
- Offline/stale states should keep the last known evidence visible with a timestamp.

Accessibility and QA rules:

- Essential values must be readable in text, not only visual marks.
- Map and chart summaries need screen-reader text alternatives.
- Keyboard users must be able to move through portals, filters, tables, and actions.
- Reduced-motion mode must disable any animated map/flow effects.
- Desktop and mobile portrait are sibling design states, not afterthoughts.

## 1. Public Expo App

### Audience

Citizens and civic volunteers in the launch pincodes. The app should feel trustworthy, fast, local, and useful in weak connectivity.

### Product Promise

"Report what is broken, verify what matters, and track whether promises get delivered."

### Primary Jobs

- Citizen reports a local issue with category, severity, privacy, location, and optional evidence.
- Citizen discovers nearby issues and supports existing reports instead of duplicating them.
- Citizen reads the local people's manifesto and promise tracker.
- Volunteer reviews clustered issues and submits field verification.
- User keeps drafts and verification work usable when the network is unreliable.

### MVP Scope

- Clerk-backed session support with a local demo fallback.
- Onboarding for citizen or volunteer only.
- Pincode/area selection using the seed geography.
- Map/list dashboard showing privacy-safe issue points.
- Report wizard with offline-first draft queue and idempotent sync.
- Issue detail with public location, category, severity, supporters, and support action.
- Volunteer verification queue with checklist, notes, verify/reject outcome.
- Manifesto read view.
- Promise tracker read view.
- "Me" screen for role, language, and offline queue state.

### Post-MVP Scope

- Media capture and upload with EXIF stripping.
- Real location permission flow and manual pin adjustment.
- Pincode search and saved areas.
- Push notifications for report clustered, verified, adopted, delayed, completed.
- Multilingual strings beyond current basic language selection.
- Volunteer safety mode and assignment routing.
- Offline verification evidence queue.
- MapLibre production map tiles and cluster overlays.

### Key Screens

- Onboarding: role, language, area.
- Map: public-safe hotspots, top issues, pincode stats.
- Report: location, category, description, severity, privacy, submit state.
- Issue detail: summary, public pin, supporters, support action, evidence later.
- Verify: cluster cards, checklist, notes, verify/reject.
- Manifesto: generated promise cards grouped by horizon.
- Tracker: adopted promises with status and target metric.
- Me: profile/session state and sync controls.

### Functional Requirements

- Report submissions must enqueue locally before any network call.
- Every report must include an idempotency key.
- Public map must use `public_latitude/public_longitude`, never exact coordinates.
- Volunteer submissions must use the authenticated or demo volunteer actor.
- Citizen role must be blocked from verification mutations by API role guard.
- Manifesto and tracker reads must tolerate no data yet with clear empty states.

### UX Principles

- First screen is the product, not a marketing page.
- Use concise civic language: "report", "verify", "promise", "track".
- Avoid exposing internal terms like "cluster_id" in primary UI except debug/detail contexts.
- Offline state must be explicit but not alarming.
- Privacy choices must be understandable before submit.

### Visualization And Interaction Plan

Primary analytical jobs: geography, issue ranking, offline sync state, and lifecycle tracking.

- Map dashboard: privacy-safe pincode or blurred-sector issue points, category filters, top issue list, and pincode coverage summary.
- Issue cards: category badge, severity label, support count, verification status, and short sparkline only when there is real time-series activity.
- Report wizard: progress bar, stable step labels, visible privacy explanation, and a final sync result state.
- Verification queue: ranked cluster cards with priority, category, age, and evidence count. Avoid a dense map-first layout for field use; the decision checklist should remain visible.
- Manifesto view: group promises by horizon with direct labels for source cluster count, target metric, and status.
- Tracker view: promise status timeline and compact status chips; make "no update" visually distinct from "on track".
- Me screen: offline queue status, last sync time, and any failed draft errors.

Mobile-specific requirements:

- All tap targets at least 44 px.
- Map controls must not cover the report CTA or bottom tab bar.
- Long issue descriptions clamp in lists and expand on detail.
- Verification checklist and notes must fit one-handed portrait use.
- No chart or map value can be accessible only through hover.

QA checks:

- Confirm public map uses `public_latitude/public_longitude`.
- Confirm text does not overflow in category tiles, role cards, and bottom tabs.
- Confirm offline queue state survives app reload.
- Confirm reduced/no-network state is understandable.

### Acceptance Criteria

- A citizen can onboard, create an offline draft, sync it, open it, and support it.
- A volunteer can open the verification tab, select a clustered issue, add notes, and verify it.
- A citizen cannot submit verification.
- Manifesto/tracker screens render useful empty and loaded states.
- Mobile typecheck passes.

## 2. Party Portal

### Audience

Party manifesto leads, candidate teams, campaign researchers, and authorized party operators.

### Product Promise

"Convert verified public demand into measurable commitments without losing source evidence."

### Primary Jobs

- Understand verified issue demand in a pincode/ward/constituency.
- Generate a people's manifesto draft from verified clusters.
- Review promise wording, metric, owner, and timeline.
- Adopt promises into an official party/candidate commitment set.
- Publish or export a public-facing manifesto.

### MVP Scope

- Route: `/party`.
- Clerk-ready auth provider and server-owned role guard.
- Demo mode sends `party_lead` role header.
- Manifesto draft load/generate action.
- Promise list with title, description, horizon, metric.
- Adopt first/selected promise into party promises.
- Adopted promises panel with status.
- Empty state when no manifesto exists.

### Post-MVP Scope

- Promise diff: citizen demand vs party wording.
- Edit adopted title, description, owner, target metric, timeline.
- Reject or defer promises with public explanation.
- Feasibility/costing fields.
- Party profile selection for multi-party/candidate support.
- Publish workflow with approval state.
- Export PDF and public share page.
- AI-assisted rewrite with source-preserving constraints.

### Key Screens

- Party dashboard: demand summary, verified clusters, manifesto readiness.
- Manifesto draft: generated promise groups.
- Promise review: source cluster evidence, editable party version.
- Adopted promises: official list, status, publish readiness.
- Publish/export: final version, warnings, audit confirmation.

### Functional Requirements

- Only `party_lead` or `platform_admin` can generate manifestos or adopt promises.
- Every generated manifesto stores the area and version.
- Every adopted promise references a source manifesto promise.
- Every adoption writes `promise.adopt` audit event.
- Generated text must show source cluster references before public release.

### UX Principles

- Party users need confidence and control; do not auto-publish.
- Make differences between public demand and party commitment visible.
- Keep metrics measurable and timeline-bound.
- Do not hide evidence provenance behind AI language.

### Visualization And Interaction Plan

Primary analytical jobs: comparison, evidence traceability, promise readiness, and publication workflow.

- Demand overview: ranked verified clusters by priority score, report count, support count, and recency.
- Manifesto readiness: compact progress summary showing verified clusters, generated promises, adopted promises, and unresolved review items.
- Promise diff: two-column citizen demand vs party version with inline highlights for changed scope, added timeline, missing owner, softened metric, or unaddressed evidence.
- Source evidence drawer: direct links to source clusters, representative issue summaries, verification outcome, and audit events.
- Adoption workflow: status rail from draft -> under review -> adopted -> published, with audit confirmation after each mutation.
- Export preview: print/PDF-safe manifesto layout with source count and methodology note.

State model:

- URL state should preserve area, selected promise, review status, and active diff.
- Unsaved edits must be explicit and recoverable.
- Publish actions require confirmation and should show exactly what becomes public.

QA checks:

- Adoption cannot occur without a source manifesto promise.
- Generated and adopted promise views always show source context.
- Promise metrics remain visible without hover.
- Party wording changes are auditable.

### Acceptance Criteria

- A party lead can generate a draft for the active area.
- A party lead can adopt a promise.
- A non-party actor receives forbidden for adoption.
- Adopted promises appear in party portal and public tracker.
- Web build passes.

## 3. Volunteer Portal

### Audience

Trusted civic volunteers, NGO partners, field coordinators, and moderators doing evidence review.

### Product Promise

"Turn noisy reports into trustworthy, verified clusters."

### Primary Jobs

- Review clustered reports needing verification.
- Compare location, description, evidence, duplicate likelihood, and severity.
- Submit structured verification outcome.
- Add field notes and checklist evidence.
- Escalate suspicious or unsafe reports.

### MVP Scope

- Route: `/volunteer`.
- Demo mode sends `volunteer` role header.
- Queue of clustered issues from the API.
- Selected cluster detail summary.
- Checklist: location matches, evidence clear, duplicate checked.
- Verify selected cluster.
- Empty state when no clustered issues exist.

### Post-MVP Scope

- Volunteer assignment and workload routing.
- Map route/context view.
- Evidence upload and moderation flags.
- Duplicate merge workflow.
- Safety prompt and emergency guidance.
- Volunteer reputation and quality scoring.
- Review history and appeals.

### Key Screens

- Verification queue: priority, category, age, pincode.
- Cluster detail: reports, public map, evidence, reporter-hidden metadata.
- Checklist: structured verification criteria.
- Outcome modal: verified, insufficient evidence, duplicate, rejected.
- Volunteer history: completed checks and dispute outcomes.

### Functional Requirements

- Only `volunteer`, `platform_moderator`, or `platform_admin` can submit verification.
- Verification outcome must include cluster ID, outcome, checklist, and optional notes.
- Verified outcome should update cluster status in persistence layer.
- Every verification writes `cluster.verify` audit event.
- Volunteer UI must never reveal private reporter identity.

### UX Principles

- Treat verification as a serious civic action, not a casual vote.
- Keep checklists short enough for field use.
- Make uncertainty acceptable: "insufficient evidence" is a valid outcome.
- Avoid exposing raw internals unless useful for review.

### Visualization And Interaction Plan

Primary analytical jobs: queue triage, spatial context, evidence sufficiency, and outcome confidence.

- Queue view: sorted by priority, age, proximity, duplicate risk, and evidence count.
- Cluster detail: public-safe map, issue samples, support count, category, severity distribution, and previous verification attempts.
- Evidence panel: thumbnail grid or list with media type, timestamp, moderation state, and "needs review" markers. Originals remain private.
- Checklist: binary criteria plus notes; use clear pass/fail/inconclusive labels.
- Outcome summary: show what will happen to cluster status before submit.

Mobile/field requirements:

- Volunteer mobile and web must both support quick decisions.
- Low-bandwidth mode should use text summaries before media thumbnails.
- Location context should be enough to orient the volunteer without exposing exact reporter pins.

QA checks:

- Verification queue does not expose reporter identity.
- Rejected/duplicate/insufficient outcomes remain valid and visible.
- Checklist values are included in submitted payload and audit trail.

### Acceptance Criteria

- Volunteer can verify a seeded cluster.
- Citizen verification attempt returns 403.
- Audit trail records verifier and outcome.
- Queue and empty states render correctly.

## 4. Department Officer Portal

### Audience

Department officers, public works coordinators, delivery owners, and authorized representatives.

### Product Promise

"Give official delivery updates that citizens can see, challenge, and verify."

### Primary Jobs

- View adopted promises relevant to department ownership.
- Add delivery status update.
- Attach evidence or public reference link.
- Mark status as on track, completed, delayed, disputed.
- Respond to citizen or moderator challenges.

### MVP Scope

- Route: `/officer`.
- Demo mode sends `department_officer` role header.
- Adopted promise list.
- Status selector.
- Publish delivery update action.
- Status mix summary.
- Empty state when no adopted promises exist.

### Post-MVP Scope

- Department ownership model.
- Evidence upload and document links.
- Milestone timeline.
- Challenge/response flow.
- Citizen verification of completion.
- SLA and delay reason taxonomy.
- Department-level dashboards.

### Key Screens

- Officer dashboard: assigned promises and overdue work.
- Promise detail: source demand, adopted commitment, timeline, evidence.
- Update form: status, update text, evidence URL/media, milestone.
- Challenge queue: public disputes and moderator escalations.
- Department report card: completion, delay, dispute rates.

### Functional Requirements

- Only `department_officer` or `platform_admin` can create delivery updates.
- Update must reference an adopted party promise.
- Update status must update the party promise status.
- Every update writes `delivery.update` audit event.
- Public tracker reads delivery updates without exposing private officer metadata beyond allowed role/context.

### UX Principles

- Officer workflow should be utilitarian and low-drama.
- Status labels must be plain and auditable.
- Evidence should be encouraged but not block text-only MVP updates.
- Citizens should see progress without needing to understand government internals.

### Visualization And Interaction Plan

Primary analytical jobs: status monitoring, timeline change, overdue work, and evidence-backed updates.

- Promise queue: adopted promises grouped by department, status, due date, and pincode.
- Delivery timeline: milestone rail showing adopted, owner assigned, work started, update posted, citizen verified, completed/disputed.
- Status mix: compact bars for on track, completed, delayed, disputed, and no update.
- Update form: status selector, update text, evidence URL/media, affected pincode, and milestone.
- Evidence view: before/after images or document links where available, with clear source labels.

State model:

- URL state should preserve department, status, pincode, and selected promise.
- Delivery updates must be append-only in the timeline; corrections are new updates, not edits to history.

QA checks:

- Officer cannot update promises that do not exist.
- Status changes are visible in tracker immediately after update.
- Delay/dispute states have explanatory text, not only status color.

### Acceptance Criteria

- Officer can add a delivery update to an adopted promise.
- Promise status changes after update.
- Non-officer mutation returns forbidden.
- Update appears in tracker flow.

## 5. Admin Portal

### Audience

Platform administrators, moderators, trust/safety reviewers, and operators.

### Product Promise

"Keep TGIM trustworthy, auditable, and operationally manageable."

### Primary Jobs

- Manage users and server-owned roles.
- Review audit trail.
- Manage areas and pincode launch coverage.
- Moderate unsafe, duplicate, spammy, or manipulated reports.
- Inspect system health and data quality.

### MVP Scope

- Route: `/admin`.
- Demo mode sends `platform_admin` role header.
- Audit trail view.
- Controls summary for roles, Clerk identity, pincode-first geography.
- Admin-only audit API access.
- Server-side role update endpoint guarded by admin role.

### Post-MVP Scope

- User search and role management UI.
- Moderation queue and report hiding/restoring.
- Area/pincode management.
- Category taxonomy management.
- Audit filters and export.
- Suspicious activity detection.
- Data deletion/privacy request workflows.
- Operator analytics and system health.

### Key Screens

- Admin overview: health, queues, audit volume, unresolved flags.
- Users/roles: Clerk identity, TGIM role, status, history.
- Moderation: flagged content, duplicate reports, evidence review.
- Areas: pincode hierarchy, launch status, boundary coverage.
- Audit explorer: actor, event, target, payload, timestamp.

### Functional Requirements

- Only `platform_admin` can update roles.
- Only `platform_admin` and `platform_moderator` can read audit logs.
- Audit view must be immutable; corrections happen through new events.
- Admin actions must audit themselves.
- Role source remains TGIM DB; Clerk only authenticates identity.

### UX Principles

- Dense, scannable, operational UI.
- No decorative marketing layout.
- Show irreversible or sensitive actions clearly.
- Prefer filters, tables, and queues over card-heavy presentation.

### Visualization And Interaction Plan

Primary analytical jobs: monitoring, anomaly triage, audit traceability, and queue operations.

- Admin overview: compact health metrics, queue counts, recent mutations, failed syncs, and flagged content.
- Audit explorer: table-first view with actor, role, event type, target, timestamp, and payload summary.
- Role management: user table with Clerk identity, TGIM role, last activity, role history, and risk flags.
- Moderation queue: grouped by report, evidence, duplicate suspicion, privacy risk, and abuse type.
- Area manager: pincode hierarchy map/list with launch status, report volume, verified clusters, and boundary coverage.

State model:

- URL-backed filters for event type, actor role, target table, pincode, date range, and moderation status.
- Saved admin views for common queues.
- Bulk actions require preview and confirmation.

QA checks:

- Audit rows are immutable.
- Admin role changes create audit events.
- Tables remain usable on laptop and collapse to list/detail on mobile.
- Sensitive payload fields are redacted where needed.

### Acceptance Criteria

- Admin can read audit events.
- Non-admin/non-moderator audit access returns forbidden.
- Admin can update role through API.
- Audit events include admin mutations.

## 6. Public Web / Share Surfaces

### Audience

Citizens without the app, journalists, civil society, campaign observers, and anyone receiving a shared promise or issue link.

### Product Promise

"See the public evidence, promise, and delivery record without logging in."

### MVP Scope

This is not fully implemented yet. For product planning, public web should remain read-only and privacy-safe.

- Public issue/cluster page.
- Public manifesto page by area.
- Public promise tracker page.
- Public area dashboard.
- Share cards or exportable summary links.

### Post-MVP Scope

- SEO-readable public pages.
- Embeddable charts.
- Journalist/civil society export packs.
- Public methodology pages.
- RSS/JSON feeds for verified clusters and delayed promises.

### Functional Requirements

- No auth required for public reads.
- No exact coordinates, reporter identity, or private media.
- Public pages must clearly distinguish report, verification, party adoption, and official update.
- Public pages should cite cluster/promise IDs and audit timeline.

### UX Principles

- Public pages should read as evidence records, not campaign ads.
- Make source and status clear.
- Keep sharing simple and trustworthy.

### Visualization And Interaction Plan

Primary analytical jobs: explanation, public accountability, source trust, and shareability.

- Area dashboard: pincode-level issue volume, category mix, verified clusters, manifesto readiness, and delivery score.
- Public cluster page: issue summary, public-safe map, verification state, source count, evidence summary, and lifecycle timeline.
- Public manifesto page: promises grouped by horizon with source cluster count and adoption state.
- Public promise page: adopted wording, source demand, delivery timeline, updates, evidence links, and dispute state.
- Share card: compact title, area, status, metric, and last update.

Export/report requirements:

- Public pages should print cleanly.
- PDF/share exports must include methodology and privacy caveat.
- Data embeds must show last updated and source counts.

QA checks:

- No public page includes exact coordinates or reporter identity.
- Essential evidence is visible without login.
- Public pages remain understandable on mobile portrait.

### Acceptance Criteria

- A public viewer can understand what happened, where broadly, who committed, and what changed.
- Privacy guardrails pass on every public response.

## 7. Platform API And Data Product

### Audience

All client apps, internal operations, future integrations, researchers, and data/export consumers.

### Product Promise

"One auditable civic data model powering all apps."

### Primary Jobs

- Authenticate identity and resolve TGIM role.
- Validate and persist issue, verification, manifesto, promise, delivery, and audit data.
- Protect public data from exact location/identity leaks.
- Support in-memory local development and Neon/Postgres production.
- Provide typed client contracts through shared schemas.

### MVP Scope

- Fastify API.
- Clerk JWT verification with demo fallback.
- DB-owned roles.
- Zod validation in `@tgim/shared`.
- Typed fetch client in `@tgim/api-client`.
- In-memory fallback and Prisma/Postgres branches.
- Core endpoints: auth role, areas, issues, verification, manifesto, party promises, tracker updates, audit.
- Prisma schema with `clerk_user_id` mapping.
- Configurable API host/port for local dev.

### Post-MVP Scope

- Real pincode hierarchy and area search.
- Signed media upload.
- Worker jobs for clustering, dedupe, scoring, AI drafting, notifications.
- Safer parameterized SQL around PostGIS operations.
- Public/private response DTO separation.
- Rate limits, abuse controls, bot protection.
- Research export API.
- Observability and structured event metrics.

### API Role Matrix

| Capability | Citizen | Volunteer | Party Lead | Officer | Moderator | Admin |
|---|---:|---:|---:|---:|---:|---:|
| Public reads | yes | yes | yes | yes | yes | yes |
| Create/support issue | yes | yes | no | no | no | yes |
| Submit verification | no | yes | no | no | yes | yes |
| Generate manifesto | no | no | yes | no | no | yes |
| Adopt promise | no | no | yes | no | no | yes |
| Delivery update | no | no | no | yes | no | yes |
| Read audit | no | no | no | no | yes | yes |
| Update roles | no | no | no | no | no | yes |

### Functional Requirements

- All mutating routes validate request body with shared schemas.
- All role-protected routes resolve actor before mutation.
- All mutations write audit events.
- API client supports bearer token injection and app-level headers.
- In-memory and Prisma branches must preserve behavior parity.
- Public issue list/detail responses must be privacy-safe.

### Acceptance Criteria

- API build passes.
- Shared and API client builds pass.
- In-process API smoke verifies health, issue create, volunteer verify, admin audit, forbidden citizen verification.
- Prisma migration can add `clerk_user_id` when DATABASE_URL is available.

### Data Visualization Contracts

The API should support visualization without forcing clients to over-fetch raw records.

Required aggregate DTOs:

- Area dashboard summary: report count, support count, verified cluster count, manifesto readiness, delivery score, category mix, status mix, and last updated.
- Issue cluster summary: source report count, support count, severity distribution, verification status, public centroid/area, and priority score.
- Promise tracker summary: adopted count, completed count, on-track count, delayed count, disputed count, no-update count.
- Audit summary: event counts by type, actor role, target table, and time window.

Required client-state contracts:

- Pagination for issue, promise, audit, and moderation lists.
- Filter schemas for pincode, area, category, status, role, date range, and search.
- Stable IDs for selected issue, cluster, manifesto promise, party promise, and audit event.
- Last-updated timestamps for every aggregate response.

Visualization QA:

- Aggregates must never include exact private coordinates.
- Counts must define whether they include hidden/moderated records.
- Status totals must reconcile with list filters.
- Audit summaries must not expose sensitive payload fields.

## 8. Shared Packages

### Audience

Developers and all runtime apps.

### Product Promise

"One shared contract for civic domain language, validation, scoring, and API access."

### Packages

- `@tgim/shared`: types, Zod schemas, design/domain tokens, priority formulas.
- `@tgim/api-client`: typed fetch client for web, mobile, and tests.

### MVP Scope

- Shared role, issue, area, promise, audit, and verification types.
- Zod request schemas for all mutating API endpoints.
- Priority scoring formula and tests.
- API client with auth token/header injection.

### Post-MVP Scope

- Public/private DTO types.
- Error response types.
- Pagination/filter schemas.
- Media upload schemas.
- Audit event taxonomy.
- Generated OpenAPI or typed route metadata.

### Acceptance Criteria

- Shared package build passes.
- API client build passes.
- Formula tests pass.
- No app defines duplicate request schemas inline.

### Design And Visualization Tokens

Shared packages should own product-level semantics that all apps use consistently:

- Category colors and labels.
- Severity labels and ordered scale.
- Promise status labels, colors, and sort order.
- Verification outcome labels and icons.
- Audit event taxonomy.
- Pincode/area type labels.
- Privacy mode labels and explanations.

The goal is to avoid visual drift where mobile, web portals, and public pages render the same civic state with different colors or names.

## Milestone Plan

### Milestone 1: Real Auth And Role Boundaries

- Clerk identity active in mobile and web.
- Server maps Clerk subject to TGIM user.
- Role management is admin-only.
- Demo headers remain local-only.
- Acceptance: protected mutations pass/deny according to role matrix.

### Milestone 2: Issue To Verification

- Citizen can submit issue with privacy and offline queue.
- Issue is clustered or assigned to a cluster.
- Volunteer can verify/reject with checklist.
- Acceptance: verified cluster appears as manifesto-ready input.

### Milestone 3: Verification To Promise

- Party lead generates manifesto from verified clusters.
- Party lead reviews and adopts at least one promise.
- Acceptance: adopted promise appears in public tracker.

### Milestone 4: Promise To Delivery

- Officer updates adopted promise status.
- Tracker shows status and update timeline.
- Acceptance: delivery update writes audit and changes promise status.

### Milestone 5: Admin And Trust

- Admin can manage roles, review audit, and moderate content.
- Moderator can inspect suspicious reports and audit history.
- Acceptance: unsafe/duplicate issue handling does not break public privacy.

### Milestone 6: Public Read Surfaces

- Public web pages for area, issue/cluster, manifesto, and promise tracker.
- Acceptance: no login required and no private data exposed.

### Milestone 7: Visualization Quality Pass

- Add aggregate API endpoints needed by maps, dashboards, timelines, and audit views.
- Add URL-backed filter state to web portals.
- Add mobile chart/map accessibility summaries.
- Add public print/export styles.
- Acceptance: each app has a clear primary visualization, direct labels, mobile path, empty/stale states, and privacy-safe data treatment.

## Open Product Decisions

- Exact pincode hierarchy and whether ward/constituency remains visible in primary navigation.
- Whether volunteer access is invite-only or open application.
- Party/candidate verification model and how party profiles are approved.
- Who can dispute a delivery update and what evidence is required.
- Public data export licensing and rate limits.
- Whether AI drafting launches as internal-only before public party use.
- Which visualization library should become canonical for standard charts: lightweight SVG components, Observable Plot/Vega-Lite, or a dedicated React charting layer.
- Whether maps should use MapLibre everywhere or only in mobile/public web while admin portals use simplified static geometry.

## Current Implementation Notes

- Package manager is pnpm; use `pnpm --filter ...` commands.
- Mobile currently has the public app shell and offline reporting.
- Web currently has route-based portals in one Vite app.
- API currently supports Clerk-ready auth and demo fallback.
- The local in-memory database remains useful for demos; Neon/Postgres is the product persistence target.
