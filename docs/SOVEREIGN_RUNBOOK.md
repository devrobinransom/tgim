# TGIM sovereign production runbook

This runbook is the operating contract for the India-hosted K3s lane. It does
not claim that VMs, DNS, certificates, backups, or provider integrations are
live. Production is released only after the evidence record below is complete.

## Target control plane

- Three or more India-resident K3s nodes across separate failure domains.
- Argo CD applies `infra/k8s/overlays/production`; operators never deploy from a
  laptop and never place secret values in Git.
- CloudNativePG runs Postgres/PostGIS with three instances and daily encrypted
  backups to the in-cluster MinIO service, copied to a second India-resident
  recovery site.
- Keycloak is the only interactive identity provider. The API verifies issuer,
  audience, signature, expiry, and subject. Web access tokens stay in HttpOnly
  cookies; Expo tokens stay in SecureStore.
- Valkey and BullMQ carry only opaque outbox event IDs. Postgres remains the
  durable event record and replay source.
- OpenProject receives public-safe delivery work packages. Metabase receives a
  read-only database role restricted to the materialized reporting views.
- In-app notifications are the default. SMTP is optional. External device push,
  Resend, QStash, Clerk, Vercel, and Cloudflare deployment are not in this lane.

## Secret boundary

Create SOPS-encrypted manifests outside this repository from
`infra/secrets.example.env`. At minimum, the cluster must contain
`tgim-runtime`, `tgim-db-owner`, `minio-root`, `minio-backup-credentials`,
`keycloak-runtime`, `openproject-runtime`, and `metabase-runtime`. The
`metabase-runtime` database user must have `SELECT` only on:

- `mv_public_issues_safe`
- `mv_cluster_priority`
- `mv_pincode_aggregates`
- `mv_area_dashboard_summary`
- `mv_audit_summary`

Never paste secret values into an issue, PR, CI log, operations endpoint, or
admin panel. Environment presence is configuration evidence, not health.

## Bootstrap sequence

1. Provision the India VMs, encrypted block storage, private network, firewall,
   and a second-site backup target. Record provider region and invoice evidence.
2. Install K3s with a shared token held outside Git. Disable public access to
   kubelet, etcd, Postgres, Valkey, MinIO, Metabase, and OpenProject admin ports.
3. Install Argo CD, import the internal chart/image registry trust root, mirror
   approved images by digest, and apply `infra/gitops/argocd/root-application.yaml`.
4. Create the runtime secrets and the additional Keycloak, OpenProject, and
   Metabase databases/least-privilege roles. Confirm CloudNativePG recovery from
   the latest backup before allowing application sync.
5. Replace both `release-sha-required` image tags in the production overlay with
   immutable image digests produced by CI. A mutable `latest` tag is forbidden.
6. Apply migrations through the Argo PreSync job. Seed only the pincode/area and
   core-form catalogs; never seed demo identities or demo role headers.
7. Configure Keycloak realm, web public client, Expo public client with PKCE,
   API audience mapper, group/area claims, MFA for privileged roles, and session
   lifetime. Record valid, expired, wrong-audience, and revoked-token tests.
8. Configure DNS/TLS, then run `scripts/verify-sovereign.sh live` from the private
   operator network. Complete browser and physical-device evidence separately.

## Backup and restore acceptance

- Continuous WAL plus daily base backup succeeds, is encrypted, and has a
  second India-resident copy.
- A clean recovery cluster reaches the recorded recovery point and passes
  migration, row-count, public-projection, and audit-integrity checks.
- MinIO bucket versioning and object lock are enabled for evidence and backups.
- Keycloak realm export, OpenProject attachments, registry metadata, GitOps
  repository, and SOPS recovery keys have documented restore owners.
- Recovery-point and recovery-time measurements are recorded; configured jobs
  without a restored readback do not pass this gate.

## Live evidence record

| Proof | Required evidence | Status |
| --- | --- | --- |
| India residency | VM, storage, backup region readback | blocked: external access |
| Database | migration ID, `/ready`, restored backup row counts | blocked: cluster absent |
| Identity | real Keycloak browser and Expo PKCE tests | blocked: realm absent |
| Queue | duplicate/retry/crash/DLQ receipts in BullMQ and outbox | blocked: Valkey absent |
| Storage | upload/read/delete plus version/retention proof | blocked: MinIO absent |
| OpenProject | create/update/retry receipt without private fields | blocked: instance absent |
| BI | read-only view query and denied base/private table query | blocked: Metabase absent |
| SMTP | test mailbox receipt and redacted message ID | blocked: relay absent |
| DNS/TLS | public records, chain, renewal and security headers | blocked: DNS absent |
| Mobile | Android/iOS restart, offline, duplicate, 401/422, recovery | blocked: devices required |

## Release rule

Local green checks prove source consistency only. Public production remains
blocked until every live evidence row has an owner, UTC timestamp, environment,
request/receipt identifier, and passing result.
