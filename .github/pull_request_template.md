<!-- Copy this checklist into your PR description. Keep diffs surgical. -->

## What this PR does

<!-- Link issue: Fixes #<id>. Use civic domain language (issue/cluster/verification/manifesto/promise/delivery/audit). -->

## Guardrail impact

- [ ] No public API/export/projection leaks exact coordinates or reporter identity (`toPublic*` only)
- [ ] Every mutation of issue/cluster/promise/delivery writes `audit_events`
- [ ] Scope-grant checks preserved for privileged mutations
- [ ] No `TODO`, dummy function, or placeholder screen

If any box is unchecked, explain why and tag a maintainer for security review.

## Verification

<!-- Paste commands + output. At minimum: -->

```
pnpm verify
# or: pnpm --filter @tgim/<pkg> <check>
sh scripts/verify-sovereign.sh static
```

- [ ] `pnpm verify` (shared build + api build/test + web build + mobile lint/typecheck/test)
- [ ] `verify-sovereign.sh static` (sovereignty invariants)
- [ ] Manual check (browser/device) if UI or geography touched

## Screenshots / evidence

<!-- Before/after for UI; request IDs or payload snippets (redacted) for API. -->

## Notes for reviewer

<!-- Flag any touch to `auth.ts`, `public-projection.ts`, `schema.prisma`, report flows, or `infra/k8s`. -->
