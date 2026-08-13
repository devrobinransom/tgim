# Civic accountability products

## The common product lesson

The credible civic products separate five concerns that early products often collapse into one record: intake, eligibility or verification, editorial or moderation review, public publication, and authority follow-through. That is the right frame for TGIM's lifecycle:

```text
private report -> deduplicated local issue -> independent verification
-> approved public demand -> adopted commitment -> delivery evidence
-> challengeable public outcome
```

The public object must be a deliberately projected version of the operational object. It must not be the operational record with a few fields removed at the HTTP boundary.

## FixMyStreet: operational issue reporting

**Observed.** [FixMyStreet's README](https://github.com/mysociety/fixmystreet/blob/58d3a713a0c5fa02ffcd515965fd99eadd4890ee/README.md) describes a user placing a pin or address, the product determining the relevant authority from location and problem type, delivery through email or a service such as Open311, public report visibility and updates, and area subscriptions. Its controller surface is correspondingly operational: it has dedicated [Report, Contact, Open311, Moderate, Status, Alert, Dashboard, and Offline controllers](https://github.com/mysociety/fixmystreet/tree/58d3a713a0c5fa02ffcd515965fd99eadd4890ee/perllib/FixMyStreet/App/Controller), rather than treating external submission as a generic webhook.

**Adopt.**

- Resolve `category + generalized area` through a versioned, reviewable authority-routing policy. It produces an explicit outcome: `not_configured`, `ready_to_send`, `accepted_by_authority`, `retryable_error`, or `permanent_error`.
- Keep citizen subscriptions distinct from issue support or voting. Subscription is a cancellable notification preference, not evidence that an issue is true or politically representative.
- Treat a public update as a dated claim with source/evidence, not as a mutable replacement for earlier delivery history.

**Do not copy.** A public report map cannot be TGIM's source of exact locations. TGIM must project a privacy-safe cluster/area location before a record is publicly searchable or routed to a public tracker. An Open311 attempt is also not official acceptance.

## Decidim: participation as a modular, authorized process

**Observed.** Decidim is a Rails participatory-democracy framework. Its reviewed tree has separate engines for [core, admin, accountability, proposals, participatory processes, initiatives, comments, meetings, budgets, elections, and verifications](https://github.com/decidim/decidim/tree/f6fff67608b96d7aeeff15f221490c22258a4255). The important lesson is that authorization/verification, participation content, accountability, and administration are explicit product boundaries rather than booleans on a user profile.

**Adopt.**

- Model TGIM eligibility as scoped claims: `volunteer_approved_for_area`, `party_operator_for_party`, `department_owner_for_authority`, and `researcher_approved_for_export`. Authentication alone must not confer these powers.
- Give every public process a clear owner, open/close dates, allowed actions, moderation policy, and immutable publication revision. A published manifesto is an approved revision, not the current editable draft.
- Use an accountability timeline that preserves evidence and dates for promises, milestones, delays, and disputes.

**Do not copy.** Decidim's wide component catalogue would make TGIM harder to operate. Start with reports, clusters, approved manifestos, adopted promises, delivery updates, and disputes; do not introduce budgets, elections, assemblies, or generic participation spaces without a committed operating owner.

## CONSUL Democracy: a government back office alongside participation

**Observed.** CONSUL describes itself as open-source e-participation software originally developed for Madrid. Its [reviewed controller structure](https://github.com/consuldemocracy/consuldemocracy/tree/7faee6e3972d535e2b786280a2f5e6bf45bd5b9a/app/controllers) has parallel public and administrative surfaces for proposals, debates, budgets, polls, comments, moderation, management, notifications, organizations, and documents. Its README also declares WAI-AA accessibility conformance as a project goal and provides admin/maintainer documentation.

**Adopt.**

- Build an operations workflow, not an admin view that merely lists raw records: assignment, decision, explanation, evidence, deadline, and audit actor must be persisted for every moderation or delivery decision.
- Support reasoned state transitions. A rejected/hidden issue, deferred promise, or resolved dispute needs a controlled vocabulary plus human notes and an appeal/challenge path.
- Treat accessibility, translation, notifications, and document handling as release responsibilities of each public flow, not later add-ons.

**Do not copy.** TGIM must not equate popular voting with validation of a local report, nor make a political action eligible merely because an account exists. Verification and authorization remain distinct from engagement.

## Ushahidi: connectors are ingestion pipelines, not product truth

**Observed.** Ushahidi's reviewed README describes collecting information from SMS, Twitter, RSS, and email; processing, categorizing, geolocating, and publishing it on a map. The repository is specifically the [REST API backend](https://github.com/ushahidi/platform/blob/78f81b4be6c9aa7cc0a49d6b9d53cf744f45d382/README.md), with a separately named browser client. Its source has explicit [HTTP, jobs, policies, providers, and API route boundaries](https://github.com/ushahidi/platform/tree/78f81b4be6c9aa7cc0a49d6b9d53cf744f45d382/app).

**Adopt.**

- Represent WhatsApp, web forms, Open311 responses, imports, and future SMS as named connectors with a source record, consent/notice state, normalized payload, mapping decision, and delivery/error audit.
- Normalize incoming material into a private intake object first. Only a reviewed, privacy-projected issue/cluster may enter public map or tracker queries.
- Keep connector retries, signatures, rate limits, and duplicate handling in a worker boundary. They must not run as part of browser requests.

**Do not copy.** A broad social-source ingestion model increases doxxing, misinformation, consent, and moderation risk. TGIM should not add social feeds or public inbound messaging until it has a trained review operation and a written source/retention policy.

## Decisions for TGIM

| Decision | Recommendation | Evidence from study |
| --- | --- | --- |
| Public map | Query privacy-projected clusters/areas only; never raw issues | FixMyStreet/Ushahidi validate map reporting; TGIM's threat model requires a stricter projection |
| External authority routing | Use per-authority policies and durable result states | FixMyStreet has dedicated contact/Open311 paths; Ushahidi separates ingestion/backend work |
| Participation eligibility | Store scoped approvals/memberships separately from authentication | Decidim separates verification and participation; CONSUL has distinct management/moderation surfaces |
| Public publication | Human-approved, immutable revision with a reversible visibility state | Decidim accountability pattern and CONSUL back-office separation |
| Challenge and moderation | Persist state mutation, reason, actor, source evidence, and appeal status | CONSUL's explicit moderation/management surface |
