# Control-plane products: Ever Gauzy

## Why this is relevant

TGIM has multiple operational actors and external services. A product can have excellent citizen screens and still fail in operation if there is no source of truth for who owns a party, area, authority, provider, integration, or audit decision. Gauzy is useful here because it is a real multi-module business product, not because TGIM should become an ERP.

## What the source shows

The [reviewed Gauzy repository](https://github.com/ever-co/ever-gauzy/tree/e4cd0e8263a36906dcfb4ccf15d330a042a78e12) publishes a headless platform with separately named applications and packages. The [package boundary](https://github.com/ever-co/ever-gauzy/tree/e4cd0e8263a36906dcfb4ccf15d330a042a78e12/packages) includes `auth`, `contracts`, `core`, `config`, `plugins`, `scheduler`, UI packages, and common utilities. Its README lists roles/permissions, multi-organization operation, data import/export, notifications, integrations, and public organization/employee pages as product capabilities.

That is the relevant pattern: governance and provider settings are first-class subsystems with contracts, not ambient environment variables and ad hoc admin buttons.

## TGIM control-plane design

### Organization and scope

Introduce a server-owned scope graph:

```text
Platform
  -> operating organization / party / public authority / research institution
    -> geographical or departmental scope
      -> membership / delegation / approval with start and end dates
```

Roles become grants within that graph. For example, `party_operator` may adopt or edit promises only for its party and assigned area; `department_officer` may update cases only for the assigned authority/department; `moderator` may act only within a configured moderation scope. Every authorization check must be performed by the API, not inferred from a web route or mobile role selector.

### Settings and providers

Separate configuration into two classes:

- **Deployment secrets:** Clerk, storage, Open311, email, push, AI, and queue credentials remain encrypted environment/runtime secrets and are never readable from the admin UI.
- **Operational configuration:** authority routing rules, enabled connectors, category mappings, templates, retention windows, notification policies, provider health state, and feature availability are versioned server records administered by authorized operators.

An integration must have `disabled`, `configured`, `verifying`, `healthy`, `degraded`, and `failed` operational states. `configured` means a reference to secrets exists; it is not a connectivity claim. A provider health check is audited and must redact credentials and personal payloads.

### Audit and administration

Use the existing audit-event idea as a domain capability, not merely a log table. Administrative changes require actor, effective scope, action, previous and next state, reason, request/correlation ID, and timestamp. Public views expose only accountability details that are safe to disclose.

The initial admin experience should cover these narrow workflows:

1. approve/revoke scoped volunteer, party, authority, and researcher grants;
2. define authority/category routing and inspect external-case outcomes;
3. apply moderation visibility/status transitions and resolve challenges;
4. inspect provider health, queue backlog, failed delivery attempts, and audit trails without viewing unnecessary raw reports.

## Deliberate limits

- Do not copy Gauzy's modules or data model. Its ERP/HRM/finance scope would obscure TGIM's accountability domain and introduces AGPL reuse implications.
- Do not create a generic settings editor that can alter authentication, storage access, public-location precision, or audit retention without code review and deployment controls.
- Do not represent organizational ownership only in client state. It must be queryable, time-bounded, auditable, and enforced under concurrent requests.

## Acceptance criteria

- An operator who loses an area/party grant immediately loses write access even with a cached client role.
- One organization cannot read or mutate another's internal reports, external cases, or provider history unless an explicit platform-level grant exists.
- A provider test proves a real provider response or a visible, safely explained failure; it never reports success merely because environment variables are present.
- Every admin mutation has an audit record and a public moderation decision changes the query used by public surfaces.
