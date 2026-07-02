# TGIM V1 Product Architecture Spec

## Scope Decision

TGIM V1 includes citizen reporting, volunteer verification, issue clustering, map dashboards, manifesto generation, Party Studio, and delivery tracking. The first release is not just a civic complaint map; it is an evidence-to-promise-to-delivery loop.

The product should use an OSS-first architecture with React Native for mobile, Neon Postgres for the system of record, OpenStreetMap-compatible map data, S3-compatible object storage for media, and worker pipelines for clustering, manifesto generation, scoring, notifications, and exports.

## Assumptions

- The primary user experience is a mobile app for iOS and Android.
- The screenshots represent the intended v1 product surface.
- V1 must support India-wide geography, but launch can start with a small set of states, districts, assemblies, or wards.
- Manifesto generation and Party Studio are in v1, but generated promises must remain evidence-linked and reviewable.
- AI will write most implementation code, so delivery work should be split into short, independently verifiable tasks.
- No existing application repository exists in this workspace; this document is a product and architecture planning artifact.

## Problem Statement

India has many local civic problems that are visible to residents but difficult to convert into organized public demand, accountable political promises, and measurable delivery tracking. Citizens report issues in scattered places, evidence is inconsistent, local clusters are hard to verify, and political manifestos often remain disconnected from lived local needs. Parties and candidates lack a structured way to compare citizen demand with their own commitments, while researchers and civil society lack trustworthy, location-aware datasets to analyze trends and hold institutions accountable.

TGIM solves this by creating a public civic intelligence system where people can pin problems, support or verify existing problems, add evidence, cluster related issues, generate area-specific manifestos, let parties adopt or respond to promises, and track whether adopted promises are delivered. The system must preserve privacy, resist manipulation, support multilingual usage, and make every generated recommendation traceable back to citizen inputs and verified evidence.

## Product Vision

TGIM becomes the civic operating layer between citizens, volunteers, candidates, parties, researchers, and public institutions. It turns local problem reports into verified issue clusters, converts clusters into manifesto-ready promises, enables political actors to adopt or explain changes, and lets the public track delivery over time.

## Architecture Principles

- Evidence first: every cluster, priority score, and generated promise links back to reports, confirmations, evidence, and verification events.
- Privacy by design: exact locations, identity, and media metadata are protected by default where risk exists.
- OSS-first: prefer open map data, open protocols, open database extensions, and self-hostable infrastructure.
- Human review for civic claims: AI assists summarization and drafting, but volunteer/admin/party review controls public status changes.
- Modular monolith first: build clean domain modules in one deployable backend before extracting services.
- Offline tolerant: citizens and volunteers must be able to draft reports and evidence when connectivity is weak.
- Auditability: every material change to issue status, promise wording, adoption, rejection, dispute, or delivery state is logged.

## Recommended System Architecture

### Client Layer

- React Native with Expo and TypeScript.
- MapLibre React Native for OSM/vector map rendering, markers, clusters, heatmaps, and offline-capable map surfaces.
- TanStack Query for server state, optimistic interactions, and cache invalidation.
- Local-first queue using SQLite or MMKV for report drafts, offline submissions, evidence uploads, and retry state.
- Native modules for location, camera, gallery, notifications, sharing, and file uploads.
- i18n support for English, Hindi, Marathi, Tamil, Bengali, and later regional languages.

### Backend Layer

- Node.js/TypeScript API using Fastify or NestJS.
- Domain modules: auth, geography, issues, evidence, verification, clusters, manifesto, party studio, tracker, notifications, moderation, exports, admin.
- REST or tRPC-style API for mobile and admin clients.
- Server-side writes for all sensitive mutations; avoid direct database writes from the mobile app.
- Signed upload flow for media.
- Background job queue for expensive or asynchronous work.

### Data Layer

- Neon Postgres as the authoritative relational database.
- PostGIS for points, polygons, area containment, distance, blurred locations, and boundary joins.
- pgvector for semantic issue similarity, manifesto promise similarity, and duplicate detection.
- Full-text and trigram search for states, districts, constituencies, wards, issues, promises, and organizations.
- Materialized views for area dashboards, priority rankings, manifesto readiness, delivery scores, and public aggregates.
- Read replicas or cached API responses for public high-read dashboard traffic as needed.

### Media Layer

- S3-compatible object storage such as Cloudflare R2, MinIO, Tigris, or AWS S3.
- Client uploads via signed URLs.
- Server-side processing for EXIF stripping, thumbnails, video previews, hash-based duplicate detection, moderation flags, and evidence metadata.
- Private originals with public-safe derivatives.

### Map Layer

- OpenStreetMap base data and official/public admin boundary datasets.
- Vector tiles served through Martin, TileServer GL, or equivalent OSS tile infrastructure.
- MapLibre style JSON for dark civic map styling.
- Server-provided GeoJSON/vector-tile overlays for issue clusters, boundaries, priority heatmaps, and delivery areas.
- V1 should implement 2D and tilted 3D-style views first. A true globe can be a later specialized map mode.

### Worker Layer

- BullMQ with Valkey/Redis for v1, or Temporal if workflow durability becomes a core requirement early.
- Jobs: media processing, reverse geocoding, clustering, duplicate detection, priority scoring, manifesto generation, promise diffing, PDF export, notification fanout, delivery score refresh, data anonymization.
- AI tasks must write structured outputs with citations to source issue IDs, cluster IDs, evidence IDs, and scoring factors.

### AI Layer

- Deterministic rules handle scoring, eligibility, dedupe thresholds, and status transitions.
- AI assists with issue summarization, cluster titles, manifesto promise drafts, promise comparison, and public-readable summaries.
- Generated text must store source citations and confidence metadata.
- Party-published manifesto content must require explicit party/candidate review.

## SMART Goals

| ID | Goal | Metric | Target | Deadline |
| --- | --- | --- | --- | --- |
| G1 | Enable citizens to submit credible local problems quickly. | Median time from open app to submitted report | Under 90 seconds for text-only report | V1 beta |
| G2 | Make issue discovery location-aware. | Areas with map dashboard, search, filters, and category layers | 100% of launch geographies | V1 beta |
| G3 | Turn raw reports into verified issue clusters. | Verified clusters with at least 3 reports or 1 field verification | 80% of high-priority clusters in launch areas | 30 days after beta |
| G4 | Generate evidence-linked local manifestos. | Generated promises with traceable source clusters | 100% of generated promises | V1 beta |
| G5 | Let parties/candidates compare and adopt citizen promises. | Party Studio can adopt, modify, reject, and publish promises | Available for every launch constituency/ward | V1 beta |
| G6 | Track promise delivery transparently. | Adopted promises with status timeline and public update path | 90% of adopted promises | 60 days after beta |
| G7 | Protect sensitive users and locations. | Reports supporting anonymous and blurred-location submission | 100% of report categories | V1 beta |
| G8 | Support multilingual usage. | Core flows localized | English plus 4 Indian languages | V1 beta |
| G9 | Keep the platform auditable. | Material status changes with audit event | 100% of status, verification, promise, and delivery changes | V1 beta |
| G10 | Support AI-assisted rapid delivery. | Engineering tasks independently testable in short intervals | 80% of tasks under 2 hours | Throughout build |

## Product Objectives

| ID | Objective | Business/Product Outcome |
| --- | --- | --- |
| O1 | Capture citizen problems with location, category, description, severity, privacy, and evidence. | High-quality civic issue intake. |
| O2 | Aggregate problems into searchable, visual, area-specific dashboards. | Shared public understanding of local priorities. |
| O3 | Verify and cluster related problems using volunteers, confirmations, evidence, and similarity analysis. | Trustworthy issue clusters rather than noisy complaints. |
| O4 | Generate local manifestos from verified demand. | Actionable promise lists for citizens and candidates. |
| O5 | Provide Party Studio for promise review, adoption, rejection, comparison, and publishing. | Political actors can respond to citizen demand with accountability. |
| O6 | Track delivery after promises are adopted. | Public progress visibility and dispute handling. |
| O7 | Protect privacy, reduce abuse, and preserve audit history. | Safer public civic participation. |
| O8 | Expose research-ready data exports with privacy safeguards. | Civil society and researchers can analyze trends. |

## Stakeholder Matrix

| Stakeholder | Interest | Influence | Needs | Main Risks | Engagement Model |
| --- | --- | --- | --- | --- | --- |
| Citizens | High | Medium | Easy reporting, privacy, visible impact, local language | Fear of exposure, report fatigue, low trust | Mobile app, notifications, support and evidence flows |
| Volunteers | High | Medium | Verification tools, route/context, evidence checklist, safety | Field safety, bias, manipulation | Volunteer console, training prompts, verification audit |
| Party/Candidate Teams | High | High | Promise demand, feasibility view, adoption tools, public publishing | Reputational risk, misinterpretation, hostile edits | Party Studio, review queue, official publish controls |
| Elected Representatives | Medium | High | Delivery dashboard, dispute handling, progress updates | Public challenge, incomplete department data | Tracker views, official response workflow |
| Civic Admin/Public Departments | Medium | High | Issue clusters, evidence, department ownership, progress updates | Political sensitivity, data accuracy | Department views, export/API, status update workflow |
| Researchers | High | Low | Structured anonymized data, trend analysis, methodology | Privacy exposure, selection bias | Research export, data dictionary, public methodology |
| NGOs/Civil Society | High | Medium | Campaign-ready clusters, volunteer coordination, evidence | Overclaiming, duplicate campaigns | Area dashboards, cluster pages, verification tooling |
| Journalists | Medium | Medium | Verified stories, evidence, trend context | Misreporting, privacy breach | Public issue pages, exportable summaries |
| Platform Admins | High | High | Moderation, fraud detection, audit logs, permissions | Abuse, legal risk, operational overload | Admin console, queues, policy rules |
| Donors/Partners | Medium | Medium | Adoption, impact, coverage, public trust | Vanity metrics, weak outcomes | Analytics reports, impact dashboards |

## User Personas

### P1: Asha, Local Citizen

- Context: Lives in a dense ward and faces recurring waterlogging and garbage issues.
- Goals: Report problems quickly, avoid personal exposure, see if others nearby have the same problem.
- Needs: Local language, current location, photo upload, anonymous mode, notifications.
- Frictions: Low trust that reports matter, weak connectivity, fear of backlash.
- Success: Her issue joins a verified cluster and appears in the ward manifesto.

### P2: Imran, Civic Volunteer

- Context: Volunteers on weekends to verify issues in his area.
- Goals: Find high-priority unverified clusters, add field evidence, mark duplicates.
- Needs: Verification checklist, map route/context, offline evidence upload, safety guidance.
- Frictions: Fake reports, duplicate submissions, unclear verification standards.
- Success: He verifies clusters that become manifesto-ready.

### P3: Meera, Party Manifesto Lead

- Context: Builds a ward or constituency manifesto for a candidate.
- Goals: Understand citizen demand, compare party wording with public demand, adopt viable promises.
- Needs: Promise diff, support counts, feasibility signals, owner/timeline fields, publish workflow.
- Frictions: Citizen promises may be too broad or costly, teams need review and approvals.
- Success: Publishes an official manifesto with adopted evidence-linked promises.

### P4: Ravi, Candidate

- Context: Wants to campaign on local priorities with credible claims.
- Goals: Know what voters care about, commit to measurable promises, show progress later.
- Needs: Area overview, priority score, promise cards, simple sharing/export.
- Frictions: Time pressure, fear of public disputes, lack of department ownership clarity.
- Success: Uses TGIM manifesto promises in campaign and updates delivery status.

### P5: Kavya, Researcher

- Context: Studies urban service delivery and civic demand.
- Goals: Analyze issue trends across areas and time.
- Needs: Anonymized exports, methodology, category taxonomy, geospatial aggregation.
- Frictions: Biased participation data, privacy restrictions, changing boundaries.
- Success: Produces reliable analysis without exposing individual citizens.

### P6: Suresh, Department Officer

- Context: Receives pressure about local roads, water, and public health issues.
- Goals: See verified clusters, understand ownership, update work progress.
- Needs: Department queue, evidence summaries, status update path, dispute response.
- Frictions: Limited resources, political sensitivity, incomplete ground data.
- Success: Updates delivery progress and closes verified work with citizen confirmation.

### P7: Nisha, Platform Moderator

- Context: Reviews flagged content and suspicious activity.
- Goals: Keep public data safe, remove abuse, prevent coordinated manipulation.
- Needs: Moderation queue, audit trails, duplicate/fraud signals, escalation tools.
- Frictions: High volume, ambiguous evidence, language variation.
- Success: Harmful content is blocked without suppressing valid civic reporting.

### P8: Dev, Journalist

- Context: Covers local public service failures.
- Goals: Find verified, evidence-rich clusters and delivery gaps.
- Needs: Public cluster page, timeline, evidence summaries, exportable charts.
- Frictions: Need source confidence and privacy-safe visuals.
- Success: Publishes accurate coverage based on verified public data.

## User Journeys

### J1: Citizen Onboarding and Area Setup

1. User opens TGIM.
2. Selects role: Citizen, Volunteer, Party/Candidate, Researcher, or Just Exploring.
3. Selects language.
4. Grants location or chooses place manually.
5. Lands on map/dashboard for the selected area.
6. Success: app stores role, language, and area preference and shows relevant local issues.
7. Failure handling: if location permission is denied, manual place search remains available.

### J2: Citizen Pins a Problem

1. Citizen taps "Pin a Problem".
2. Chooses current location, manual pin, or blurred location.
3. Selects category such as Water, Roads, Garbage, Health, Safety, Jobs, Transport, or Housing.
4. Adds description by text or voice input.
5. Adds optional photos/videos.
6. Selects severity and suggested fix.
7. Chooses public, anonymous, or blurred-location privacy.
8. Submits report.
9. Success: issue is created, media uploads complete, and the issue enters dedupe/moderation/cluster pipeline.
10. Failure handling: if offline, report is saved locally and queued for upload.

### J3: Citizen Supports or Adds Evidence to an Existing Problem

1. Citizen opens an issue detail page from map/search/category list.
2. Reviews summary, location, evidence, status, and confirmations.
3. Taps Support, Add Evidence, or Suggest Fix.
4. Adds optional media or context.
5. Success: support count and evidence count update, and cluster priority is recalculated.
6. Failure handling: duplicate evidence is flagged and the user is shown existing similar evidence.

### J4: Volunteer Verifies a Cluster

1. Volunteer opens unverified or high-priority clusters nearby.
2. Reviews citizen reports, evidence, map boundary, and category.
3. Visits location or checks credible evidence.
4. Submits verification outcome: verified, needs more evidence, duplicate, unsafe to verify, or rejected.
5. Success: cluster status updates and verification event is logged.
6. Failure handling: conflicting volunteer checks trigger admin review.

### J5: System Clusters Issues and Scores Priority

1. Worker receives new issue or evidence event.
2. Computes geospatial proximity, category match, text similarity, time recency, and support signals.
3. Links issue to an existing cluster or creates a new cluster.
4. Recalculates priority score and manifesto readiness.
5. Success: map markers, dashboards, and issue detail pages reflect updated cluster state.
6. Failure handling: low-confidence cluster assignment is queued for human review.

### J6: Manifesto Is Generated for an Area

1. User opens ward/constituency dashboard.
2. Taps "Generate Manifesto".
3. System selects eligible verified clusters and ranked public demand.
4. AI drafts promises with owner, timeline, measurable outcome, evidence citations, and category.
5. Human reviewer can edit, merge, or reject generated promises.
6. Success: draft manifesto is created with sections for 100-day, 1-year, 3-year, and 5-year priorities.
7. Failure handling: if source evidence is insufficient, promise is marked "Needs Evidence" and excluded from publish-ready output.

### J7: Party Studio Reviews and Publishes Promises

1. Party/candidate team opens Party Studio for an area.
2. Reviews citizen demand and generated manifesto-ready promises.
3. Compares party version against citizen demand.
4. Sees differences such as scope reduced, timeline added, owner missing, or weaker commitment.
5. Adopts, edits, requests clarification, rejects, or comments.
6. Publishes official manifesto containing adopted promises only.
7. Success: official manifesto is public, versioned, and linked to source citizen demand.
8. Failure handling: rejected promises require a reason; edited promises keep a diff trail.

### J8: Delivery Tracking After Adoption

1. User opens Delivery Tracker for an area or promise.
2. Views adopted promises by status: completed, on track, delayed, no update, disputed.
3. Department, party, volunteer, or citizen adds progress update.
4. Citizen or volunteer verifies completion or challenges claim.
5. Success: promise timeline and area report card update.
6. Failure handling: challenged claims enter dispute status until resolved.

### J9: Research and Public Export

1. Researcher selects geography, category, time range, and privacy-safe aggregation level.
2. Downloads anonymized CSV/GeoJSON or views public dashboard.
3. Success: export excludes exact private locations, user identities, and unsafe media.
4. Failure handling: queries below minimum privacy threshold are blocked or aggregated upward.

## Requirement Traceability Matrix

| Req ID | Objective | User Story | Acceptance Criteria | Priority | Modules |
| --- | --- | --- | --- | --- | --- |
| R1 | O1 | As a citizen, I can choose my role and language so that the app adapts to my intent. | Role and language persist; all core navigation labels use selected language; role can be changed later. | P0 | onboarding, i18n |
| R2 | O1 | As a user, I can use my current location or choose a place manually. | Permission denial does not block use; manual search supports state, district, constituency, city, and ward. | P0 | location, geography, search |
| R3 | O2 | As a user, I can view an India overview and drill down into states, districts, constituencies, and wards. | Map and dashboard update when area changes; selected area is saved. | P0 | map, geography, dashboard |
| R4 | O2 | As a user, I can search by state, district, constituency, issue, or promise. | Search returns areas, issues, clusters, and promises with type labels and ranking. | P0 | search |
| R5 | O2 | As a user, I can filter map layers by category, verification status, and severity. | Filter changes visible markers and dashboard counts within 1 second after data is cached. | P0 | map, dashboard |
| R6 | O1 | As a citizen, I can pin a problem at my current or selected location. | Report requires area, category, description or media, severity, and privacy option. | P0 | issues, location |
| R7 | O1/O7 | As a citizen, I can submit anonymously or blur my exact location. | Anonymous reports hide display name; blurred reports store exact internal point separately from public approximate geometry. | P0 | privacy, issues |
| R8 | O1 | As a citizen, I can add photos or videos as evidence. | Up to 5 photos and 1 short video accepted; uploads use signed URLs; EXIF is stripped before public display. | P0 | media, evidence |
| R9 | O1 | As a citizen, I can submit while offline and sync later. | Draft survives app restart; failed uploads retry; duplicate submit is prevented with idempotency key. | P0 | mobile offline, issues |
| R10 | O3 | As a user, I can support an issue without creating a duplicate report. | One support per user per issue/cluster; support count updates and audit event is recorded. | P0 | confirmations, clusters |
| R11 | O3 | As a user, I can add evidence to an existing issue or cluster. | Evidence is linked to source issue/cluster and enters moderation/media processing. | P0 | evidence, media |
| R12 | O3 | As a volunteer, I can verify an issue cluster with a structured checklist. | Verification outcome, notes, evidence, reviewer ID, and timestamp are stored. | P0 | verification |
| R13 | O3/O7 | As an admin, I can review conflicting verifications and flagged content. | Admin can approve, reject, merge, split, hide, or escalate with audit event. | P0 | moderation, admin |
| R14 | O3 | As the system, I can detect possible duplicate issues. | Similar reports in nearby area are suggested before final submit; worker calculates duplicate candidates after submit. | P0 | clustering, search |
| R15 | O3 | As the system, I can cluster related reports. | Cluster assignment uses category, distance, text similarity, time, and human overrides. | P0 | clusters, workers |
| R16 | O2/O3 | As a user, I can view area dashboard metrics. | Dashboard shows citizen inputs, verified clusters, manifesto readiness, delivery score, top issues, and priority cluster. | P0 | dashboard, analytics |
| R17 | O3/O4 | As the system, I can calculate priority score and manifesto readiness. | Scores store component factors and recompute after reports, evidence, verification, or support changes. | P0 | scoring, analytics |
| R18 | O4 | As a user, I can generate a manifesto for an area. | Manifesto draft includes 100-day, 1-year, 3-year, and 5-year sections from eligible clusters. | P0 | manifesto, AI |
| R19 | O4/O7 | As a reviewer, I can see citations for each generated promise. | Each promise links to source clusters, support count, evidence count, verification status, and score factors. | P0 | manifesto, clusters |
| R20 | O4 | As a reviewer, I can edit, merge, remove, and reorder generated promises. | Every edit creates a version entry; deleted promises remain in audit history. | P0 | manifesto editor |
| R21 | O4 | As a user, I can export or share a manifesto draft. | PDF export includes area, date, promise sections, metrics, and source methodology summary. | P1 | exports, manifesto |
| R22 | O5 | As a party/candidate user, I can open Party Studio for my selected area. | Party Studio shows citizen issue clusters, manifesto-ready promises, feedback, adopted promises, and status counts. | P0 | party studio |
| R23 | O5 | As a party user, I can compare citizen demand with party promise wording. | Diff labels identify scope reduction, timeline changes, missing owner, weaker commitment, and measurable target changes. | P0 | promise diff, AI |
| R24 | O5 | As a party user, I can adopt a citizen promise. | Adopted promise requires owner, timeline, measurable metric, and official publisher identity. | P0 | party studio, promises |
| R25 | O5 | As a party user, I can reject or request clarification on a promise. | Rejection requires reason; clarification creates public or internal comment depending on role permissions. | P0 | party studio, comments |
| R26 | O5/O7 | As the platform, I can version official manifesto publications. | Published manifesto is immutable; later changes create new version with diff and timestamp. | P0 | manifesto, audit |
| R27 | O6 | As a user, I can view adopted promises by delivery status. | Tracker groups promises into completed, on track, delayed, no update, and disputed. | P0 | tracker |
| R28 | O6 | As an authorized updater, I can add progress updates to a promise. | Update stores actor, status, evidence, text, date, and optional media. | P0 | tracker, evidence |
| R29 | O6 | As a citizen or volunteer, I can verify completion or challenge a claim. | Verification/challenge updates promise status rules and creates dispute when needed. | P0 | tracker, disputes |
| R30 | O6 | As a user, I can view an area report card. | Report card shows category scores and comparison to city/area average. | P1 | analytics, tracker |
| R31 | O7 | As the platform, I can moderate abusive, unsafe, or personal content. | Flagged items can be hidden from public surfaces while retained for audit. | P0 | moderation |
| R32 | O7 | As the platform, I can rate-limit and detect manipulation. | Suspicious report/support bursts are flagged; public counts exclude blocked activity. | P0 | trust, analytics |
| R33 | O8 | As a researcher, I can export anonymized area-level data. | Export excludes private user data and exact private coordinates; minimum aggregation threshold is enforced. | P1 | exports, privacy |
| R34 | O8 | As a journalist or public user, I can view public issue and cluster pages. | Public pages show summary, evidence count, status, timeline, and privacy-safe location. | P1 | public web, sharing |
| R35 | O7 | As an admin, I can audit all material state changes. | Audit events exist for report submit, verification, cluster changes, promise generation, adoption, publication, updates, and disputes. | P0 | audit |
| R36 | O1/O6 | As a user, I can receive notifications about reports, clusters, manifestos, and delivery updates. | User can opt in/out by category; push token registration is stored per device. | P1 | notifications |
| R37 | O2/O5 | As a party or researcher, I can compare areas and categories. | Comparison view supports at least two areas and category filters. | P2 | analytics |
| R38 | O4/O5 | As the system, I can keep AI output explainable and reviewable. | AI output stores prompt version, model/provider, source IDs, confidence, and reviewer status. | P0 | AI, audit |
| R39 | O7 | As the platform, I can apply role-based permissions. | Citizen, volunteer, party, researcher, admin, and department roles have distinct actions. | P0 | auth, permissions |
| R40 | O2/O6 | As a user, I can see live or recently updated status indicators. | Cards display last updated time based on materialized aggregate refresh or latest event. | P1 | dashboard, tracker |

## Functional Requirements by Epic

### E1: Identity, Roles, and Localization

- Role-aware onboarding.
- Language selection and persistence.
- Auth supporting anonymous browsing and signed-in actions.
- Device push token registration.
- Role-based permissions.

### E2: Geography and Maps

- India hierarchy: country, state, district, constituency, ward.
- OSM/vector map base.
- Boundary overlays.
- Cluster markers and heatmaps.
- Search and area switching.
- 2D and 3D-style map modes.

### E3: Citizen Issue Reporting

- Pin problem flow.
- Category, description, media, severity, suggested fix.
- Public, anonymous, and blurred-location privacy.
- Offline draft and sync.
- Duplicate suggestions.

### E4: Evidence, Verification, and Moderation

- Media upload and processing.
- Support/confirmation.
- Volunteer verification.
- Admin moderation.
- Evidence timeline.
- Audit events.

### E5: Clustering, Scoring, and Dashboards

- Geospatial and semantic clustering.
- Priority score.
- Manifesto readiness.
- Area dashboard metrics.
- Top issues and highest-priority cluster.

### E6: Manifesto Generation

- Generate area manifesto from verified clusters.
- Promise sections by time horizon.
- Owner, timeline, metric, evidence citations.
- Draft editing, versioning, export.

### E7: Party Studio

- Party/candidate workspace.
- Promise comparison and diff labels.
- Adopt, edit, reject, clarify, comment.
- Publish official manifesto.
- Version official publications.

### E8: Delivery Tracker

- Adopted promise status timeline.
- Progress updates.
- Citizen verification.
- Challenge/dispute workflow.
- Area report card and category scores.

### E9: Research and Public Outputs

- Public issue/cluster/manifesto pages.
- Privacy-safe data exports.
- PDF export.
- Data dictionary and methodology summary.

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Performance | Cached dashboard reads should respond under 500 ms at API p95 for launch geographies. |
| Availability | Public read surfaces should degrade gracefully if workers are delayed. |
| Privacy | Private exact locations and identity data must never be exposed by public APIs. |
| Security | All sensitive mutations require authenticated role checks and audit events. |
| Abuse Resistance | Rate limits, duplicate detection, moderation queues, and support-count integrity are required. |
| Accessibility | Core flows support screen readers, scalable text, adequate contrast, and non-color-only status indicators. |
| Localization | App strings use translation keys; area names support local scripts where available. |
| Observability | API, worker jobs, queue failures, media processing, and AI generation must emit logs and metrics. |
| Portability | Map, storage, queue, and AI providers should be replaceable through interfaces. |
| Compliance | Media and public content should support takedown, retention, and audit policies. |

## Initial Data Entities

- `users`
- `user_roles`
- `devices`
- `areas`
- `admin_boundaries`
- `categories`
- `issues`
- `issue_locations`
- `issue_media`
- `issue_supports`
- `issue_evidence`
- `verification_events`
- `issue_clusters`
- `cluster_members`
- `cluster_scores`
- `manifestos`
- `manifesto_versions`
- `manifesto_promises`
- `promise_sources`
- `party_profiles`
- `party_manifestos`
- `party_promises`
- `promise_diffs`
- `delivery_updates`
- `completion_verifications`
- `promise_disputes`
- `comments`
- `notifications`
- `moderation_events`
- `audit_events`
- `ai_generation_events`
- `export_jobs`

## Short-Interval Scrum Task List for AI Coding

### Delivery Cadence

- Work in 1-day micro-sprints.
- Split each user story into 30-120 minute AI tasks.
- Every task must have a visible stop condition: test passes, endpoint returns expected response, screen renders expected state, worker writes expected record, or migration applies cleanly.
- Merge only vertical slices that include schema, API, UI, and test coverage where applicable.
- Keep feature flags for incomplete public flows.

### Sprint 0: Product Skeleton and Architecture Foundation

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S0.1 | 60 min | Monorepo scaffold with mobile, API, shared types, workers, docs | Package scripts run locally |
| S0.2 | 60 min | TypeScript, lint, format, test setup | Lint and unit test command pass |
| S0.3 | 90 min | Neon schema migration baseline | Migration applies to dev database |
| S0.4 | 60 min | Environment config and secrets contract | App boots with example env |
| S0.5 | 60 min | Domain module folder structure | API health endpoint passes test |
| S0.6 | 90 min | Auth and role model skeleton | Role guard test passes |
| S0.7 | 60 min | Audit event helper | Mutating endpoint writes audit row in test |

### Sprint 1: Mobile Onboarding, Area, and Map

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S1.1 | 90 min | React Native navigation shell with tabs: Map, Problems, Manifesto, Tracker, Me | App renders all tabs |
| S1.2 | 60 min | Role selection screen | Selected role persists locally |
| S1.3 | 60 min | Language selection and translation keys | Language changes visible labels |
| S1.4 | 90 min | Location permission and manual place fallback | Denied permission still allows area selection |
| S1.5 | 120 min | MapLibre map screen with OSM style | Map renders and camera moves |
| S1.6 | 90 min | Area search API and mobile search UI | Searching "Mumbai" returns area result |
| S1.7 | 90 min | Area dashboard summary endpoint | Seeded area returns counts |
| S1.8 | 60 min | Bottom sheet dashboard UI | Cards render from API data |

### Sprint 2: Issue Reporting and Media

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S2.1 | 90 min | Issue schema with category, severity, privacy, status | Migration and model tests pass |
| S2.2 | 90 min | Create issue API with idempotency key | Duplicate retry returns same issue |
| S2.3 | 90 min | Pin problem wizard steps | Required fields validate |
| S2.4 | 60 min | Category selector UI | Selected category persists through submit |
| S2.5 | 90 min | Blurred-location transformation | Public geometry differs from private point |
| S2.6 | 120 min | Signed media upload API | Client receives upload URL and media record |
| S2.7 | 120 min | Mobile photo/video attach flow | Attached media appears in draft |
| S2.8 | 90 min | Offline issue draft queue | Draft survives app restart |
| S2.9 | 90 min | Submit retry worker on mobile | Failed submission retries when online |

### Sprint 3: Issue Detail, Support, Evidence, and Verification

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S3.1 | 90 min | Issue detail API | Returns summary, media, support count, status |
| S3.2 | 90 min | Issue detail mobile screen | Seed issue renders with evidence carousel |
| S3.3 | 60 min | Support issue endpoint | Same user cannot support twice |
| S3.4 | 60 min | Support button UI | Count updates optimistically and reconciles |
| S3.5 | 90 min | Add evidence endpoint | Evidence links to issue and audit row |
| S3.6 | 90 min | Volunteer verification schema/API | Verification status transition is validated |
| S3.7 | 120 min | Volunteer verification UI | Checklist submits verified or needs-more-evidence |
| S3.8 | 90 min | Moderation flag model and endpoint | Flagged media hidden from public response |

### Sprint 4: Clustering, Scoring, and Dashboards

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S4.1 | 90 min | Cluster schema and membership table | Migration passes |
| S4.2 | 120 min | Geospatial candidate query using PostGIS | Nearby same-category issues are found |
| S4.3 | 120 min | Text similarity and embedding storage | Similar issue pair stores score |
| S4.4 | 120 min | Cluster assignment worker | New issue joins expected cluster in test |
| S4.5 | 90 min | Manual merge/split admin endpoints | Merge preserves source issue history |
| S4.6 | 90 min | Priority score calculator | Score factors sum to expected result |
| S4.7 | 90 min | Manifesto readiness calculator | Verified high-support cluster becomes ready |
| S4.8 | 90 min | Dashboard materialized view | Refresh returns expected area metrics |
| S4.9 | 90 min | Map cluster overlay endpoint | Returns GeoJSON for visible bounding box |

### Sprint 5: Manifesto Generation

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S5.1 | 90 min | Manifesto and promise schema | Migration passes |
| S5.2 | 90 min | Eligible cluster selector | Only verified/ready clusters selected |
| S5.3 | 120 min | Deterministic promise draft builder | Cluster creates owner/timeline/metric draft |
| S5.4 | 120 min | AI summary interface with mock provider | Mock generation writes cited output |
| S5.5 | 120 min | Manifesto generation worker | Area generates draft manifesto with sections |
| S5.6 | 90 min | Manifesto dashboard screen | Generated manifesto renders by time horizon |
| S5.7 | 90 min | Promise edit/version endpoint | Edit creates new version record |
| S5.8 | 90 min | Manifesto export job | PDF job completes with downloadable artifact |
| S5.9 | 60 min | Source citation UI | Promise shows linked clusters and metrics |

### Sprint 6: Party Studio

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S6.1 | 90 min | Party profile and membership schema | Role permissions test passes |
| S6.2 | 90 min | Party Studio overview API | Returns counts for clusters, promises, feedback, adopted |
| S6.3 | 120 min | Party Studio screen | Overview cards and promise list render |
| S6.4 | 120 min | Promise diff engine | Scope/timeline/owner/metric differences are labeled |
| S6.5 | 90 min | Adopt promise endpoint | Adoption requires owner, timeline, metric |
| S6.6 | 90 min | Reject and clarification endpoints | Rejection requires reason |
| S6.7 | 90 min | Comment workflow | Comments attach to promise with role visibility |
| S6.8 | 120 min | Publish official manifesto endpoint | Published version is immutable |
| S6.9 | 90 min | Public official manifesto view | Only adopted promises appear in public publish |

### Sprint 7: Delivery Tracker

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S7.1 | 90 min | Delivery status schema and transition rules | Invalid transition is rejected |
| S7.2 | 90 min | Delivery tracker summary API | Returns adopted/completed/on-track/delayed/no-update/disputed counts |
| S7.3 | 120 min | Tracker mobile screen | Status cards and featured promise render |
| S7.4 | 90 min | Add progress update endpoint | Update writes timeline event |
| S7.5 | 90 min | Progress media evidence upload | Media links to delivery update |
| S7.6 | 90 min | Verify completion endpoint | Completion verification changes status when threshold reached |
| S7.7 | 90 min | Challenge claim endpoint | Challenge creates dispute and audit event |
| S7.8 | 90 min | Area report card calculator | Category scores compute from seeded data |
| S7.9 | 60 min | Tracker notification events | Watchers receive status update notification |

### Sprint 8: Trust, Privacy, Notifications, and Exports

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S8.1 | 90 min | Public/private serializer layer | Private fields absent from public API tests |
| S8.2 | 90 min | Rate limit and abuse signal middleware | Burst support attempts are blocked |
| S8.3 | 90 min | Moderation queue UI | Admin can hide and restore content |
| S8.4 | 90 min | Push notification token registration | Device token persists and can be disabled |
| S8.5 | 90 min | Notification preferences | User can opt out by category |
| S8.6 | 120 min | Research export schema and worker | Export excludes private fields |
| S8.7 | 90 min | Public cluster/manifesto sharing page | Public URL renders privacy-safe data |
| S8.8 | 90 min | Observability baseline | API and worker emit structured logs |
| S8.9 | 90 min | Backup and migration runbook | Restore drill documented and tested on dev branch |

### Sprint 9: Beta Hardening

| Task | Size | Output | Stop Condition |
| --- | --- | --- | --- |
| S9.1 | 120 min | End-to-end citizen report to cluster test | Test creates issue and cluster |
| S9.2 | 120 min | End-to-end cluster to manifesto test | Test generates cited promise |
| S9.3 | 120 min | End-to-end party adoption to tracker test | Adopted promise appears in tracker |
| S9.4 | 90 min | Accessibility pass on core mobile flows | Screen reader labels and contrast checks pass |
| S9.5 | 90 min | Performance pass on dashboard endpoints | Seeded p95 target met locally/staging |
| S9.6 | 90 min | Privacy regression tests | Anonymous and blurred reports never leak private fields |
| S9.7 | 90 min | App store build configuration | Release build completes |
| S9.8 | 90 min | Launch seed data and demo script | Demo flow can be run from fresh environment |

## Definition of Done

- Requirement has a passing automated test or explicit manual verification note.
- Public API responses do not expose private identity or exact private coordinates.
- Every mutation that changes civic state writes an audit event.
- UI supports loading, empty, success, and error states.
- Worker tasks are idempotent or have duplicate protection.
- AI-generated content stores source IDs, prompt/model metadata, and review status.
- Documentation is updated when a workflow, schema, or permission rule changes.

## Spec Self-Review

- Placeholder scan: no placeholder markers remain.
- Scope check: v1 is large but intentionally includes manifesto generation and Party Studio; implementation is split into short vertical slices.
- Ambiguity check: true 3D globe is explicitly deferred; v1 uses MapLibre 2D and tilted 3D-style map views.
- Traceability check: every product objective maps to requirements and scrum tasks.
- Risk check: privacy, moderation, auditability, and evidence citations are treated as core v1 requirements, not post-launch enhancements.
