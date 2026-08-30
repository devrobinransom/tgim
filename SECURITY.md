# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| < `v0.1.0` | :x: pre-release, best-effort |

TGIM is pre-`v1.0` civic infrastructure. `main` is the only actively maintained branch. Security fixes are applied to `main` first and tagged in the next `v0.x` release.

## Reporting a Vulnerability

**Do not open a public issue for sensitive vulnerabilities**, especially those involving:

- location privacy leaks (exact lat/lng or reporter identity in a public response),
- authorization bypass (scope-grant / role boundary),
- evidence or audit integrity (tampering, missing `audit_events` row),
- authentication (OIDC/JWT validation, MCP bearer, BFF token handling),
- PII or credential exposure.

Use **GitHub Private Vulnerability Reporting** (preferred): https://github.com/devrobinransom/tgim/security/advisories/new

If you cannot use GitHub advisories, email the repository owner via the address linked to `@devrobinransom` on GitHub and mention you are requesting a private security channel — do not include exploit details in the initial email.

Include:

- affected component (`apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, `infra/k8s`),
- reproduction steps or PoC (redact real citizen PII),
- impact assessment, especially privacy/audit impact,
- your disclosure preference.

You will receive an acknowledgement within **72 hours** and a triage update within **7 days**.

## What to Expect

- We treat location-privacy and audit-integrity reports as **P0/P1**.
- We will coordinate a fix and an advisory. We ask for **90 days** of coordinated disclosure by default; shorter if active exploitation is suspected.
- We credit reporters in the advisory unless you request anonymity.

## Scope & Hard Guardrails

The following are security invariants. A violation is treated as a security defect, not a feature request:

1. **Zero-Leak Privacy** — no public API, export, projection, aggregate, MCP, or Open311 response may contain `exact_latitude`/`exact_longitude`, `reporter_id`, raw media URLs, idempotency keys, private notes, or internal actor IDs. Every public read goes through `toPublic*` projection functions (`apps/api/src/public-projection.ts`). The server never reuses the submitted point as the public point, even for `privacy=public` (jittered/derived point).

2. **Scope-Grant Authorization** — every privileged mutation declares a `capability` and resolves an active `ActorScopeGrant` (issuer, time window, revocation). `platform_admin` bypass is explicit. Expired/revoked/cross-party/cross-authority/cross-area grants must deny.

3. **Double-Entry Audit** — every mutation of an issue, cluster, promise, or delivery state writes to `audit_events`.

4. **Production Auth** — production verifies OIDC JWT signature, issuer, expiry, audience, and subject; demo role headers (`x-demo-role` / `WEB_DEMO_ROLE`) are impossible when `SOVEREIGNTY_MODE=sovereign` / `DEMO_AUTH_ENABLED=false`. MCP verifies OAuth/OIDC per request.

## Secure Development

- `pnpm verify` must pass: shared build, api build + tests, web build, mobile lint + typecheck.
- `scripts/verify-sovereign.sh` enforces sovereignty invariants (no `vercel.json`/`wrangler.jsonc`, no `@clerk/`/`QSTASH`/`RESEND` remnants, K3s config locked to `sovereign`/`deterministic`/`NetworkPolicy`/`ScheduledBackup`).
- `infra/k8s` is the only deployment target; Crown/Cloudflare-hosted fallbacks are retired and must not be reintroduced.

## Disclosure History

Published advisories live under **Security → Advisories** on GitHub. If none are published, no CVE has been issued yet.

## Non-Security Bugs

For non-sensitive bugs (UI, build, docs, non-privacy functional issues), open a normal GitHub Issue with a minimal reproduction.
