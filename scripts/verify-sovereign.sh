#!/bin/sh
set -eu

mode=${1:-static}
required_names="DATABASE_URL VALKEY_URL OIDC_ISSUER OIDC_AUDIENCE OIDC_CLIENT_ID S3_ENDPOINT S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY CORS_ORIGINS OPENPROJECT_URL OPENPROJECT_API_KEY"

fail() { printf '%s\n' "FAIL: $1" >&2; exit 1; }
pass() { printf '%s\n' "PASS: $1"; }

test ! -f vercel.json || fail "vercel.json must not exist"
test ! -f wrangler.jsonc || fail "wrangler.jsonc must not exist"
if rg -n '(@clerk/|CLERK_|QSTASH_|[Qq][Ss]tash|VITE_|RESEND_API_KEY|exp\.host/--/api/v2/push)' apps packages package.json -g '!**/dist/**' -g '!**/node_modules/**' >/tmp/tgim-sovereignty-scan.txt; then
  sed -n '1,30p' /tmp/tgim-sovereignty-scan.txt >&2
  fail "retired hosted-provider code remains"
fi
pass "retired hosted deployment, identity, queue, email, and push paths are absent"

rg -q 'SOVEREIGNTY_MODE: sovereign' infra/k8s/base/config.yaml || fail "K3s runtime is not locked to sovereign mode"
rg -q 'DEMO_AUTH_ENABLED: "false"' infra/k8s/base/config.yaml || fail "production demo authentication is not disabled"
rg -q 'AI_PROVIDER: deterministic' infra/k8s/base/config.yaml || fail "production drafting is not locked to an in-cluster deterministic provider"
rg -q 'kind: NetworkPolicy' infra/k8s/base/network-policy.yaml || fail "network policy is missing"
rg -q 'kind: ScheduledBackup' infra/k8s/base/postgres.yaml || fail "database backup schedule is missing"
pass "K3s sovereignty, network, and backup contracts are present"

if [ "$mode" = "live" ]; then
  missing=""
  for name in $required_names; do
    eval "value=\${$name-}"
    [ -n "$value" ] || missing="$missing $name"
  done
  [ -z "$missing" ] || fail "missing runtime configuration:$missing"
  [ "${SOVEREIGNTY_MODE:-}" = sovereign ] || fail "SOVEREIGNTY_MODE must be sovereign"
  [ "${DEMO_MODE:-false}" = false ] || fail "DEMO_MODE must be false"
  curl -fsS "${TGIM_API_URL:?TGIM_API_URL is required}/ready" >/dev/null || fail "API readiness probe failed"
  curl -fsS "${TGIM_WEB_URL:?TGIM_WEB_URL is required}/api/health" >/dev/null || fail "web readiness probe failed"
  pass "live API and web readiness probes passed"
fi
