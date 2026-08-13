-- T41-T50 sovereign platform foundation. Additive by design so staging can
-- rehearse migration and application rollback independently.

ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_issuer VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_subject VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_area_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS users_identity_issuer_identity_subject_key
  ON users(identity_issuer, identity_subject)
  WHERE identity_issuer IS NOT NULL AND identity_subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_identity_subject_idx ON users(identity_subject);

ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS last_safe_error TEXT;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS outbox_events_status_next_attempt_at_created_at_idx
  ON outbox_events(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  active_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forms_status_updated_at_idx ON forms(status, updated_at);

CREATE TABLE IF NOT EXISTS form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, version)
);
CREATE INDEX IF NOT EXISTS form_versions_form_id_status_idx ON form_versions(form_id, status);

CREATE TABLE IF NOT EXISTS form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id UUID NOT NULL REFERENCES form_versions(id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  options JSONB,
  validation JSONB,
  UNIQUE(form_version_id, key)
);
CREATE INDEX IF NOT EXISTS form_questions_form_version_id_position_idx ON form_questions(form_version_id, position);

CREATE TABLE IF NOT EXISTS form_response_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id UUID NOT NULL REFERENCES form_versions(id),
  actor_id UUID NOT NULL,
  area_id UUID,
  idempotency_key UUID NOT NULL UNIQUE,
  state VARCHAR(20) NOT NULL DEFAULT 'submitted',
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_response_sessions_form_version_id_created_at_idx ON form_response_sessions(form_version_id, created_at);
CREATE INDEX IF NOT EXISTS form_response_sessions_actor_id_created_at_idx ON form_response_sessions(actor_id, created_at);

CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES form_response_sessions(id) ON DELETE CASCADE,
  question_key VARCHAR(64) NOT NULL,
  answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_key)
);

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL,
  question VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  eligibility JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT polls_window_check CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS polls_area_id_status_starts_at_ends_at_idx ON polls(area_id, status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE(poll_id, value)
);
CREATE INDEX IF NOT EXISTS poll_options_poll_id_position_idx ON poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  option_id UUID REFERENCES poll_options(id),
  ranking UUID[] NOT NULL DEFAULT '{}',
  allocation JSONB,
  value INTEGER,
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, actor_id),
  CONSTRAINT poll_votes_likert_check CHECK (value IS NULL OR value BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS poll_votes_poll_id_created_at_idx ON poll_votes(poll_id, created_at);

CREATE TABLE IF NOT EXISTS openproject_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_promise_id UUID NOT NULL UNIQUE,
  project_identifier VARCHAR(255) NOT NULL,
  work_package_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  last_safe_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS openproject_mappings_status_updated_at_idx ON openproject_mappings(status, updated_at);

CREATE TABLE IF NOT EXISTS openproject_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID REFERENCES openproject_mappings(id) ON DELETE SET NULL,
  party_promise_id UUID NOT NULL,
  direction VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider_receipt VARCHAR(255),
  last_safe_error TEXT,
  public_payload_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS openproject_sync_events_party_promise_id_created_at_idx ON openproject_sync_events(party_promise_id, created_at);

DROP MATERIALIZED VIEW IF EXISTS mv_public_issues_safe;
CREATE MATERIALIZED VIEW mv_public_issues_safe AS
SELECT
  id,
  area_id,
  cluster_id,
  pincode_code,
  category,
  severity::text AS severity,
  status::text AS status,
  ST_Y(public_location::geometry) AS public_latitude,
  ST_X(public_location::geometry) AS public_longitude,
  created_at,
  updated_at
FROM issues
WHERE visibility = 'public';
CREATE UNIQUE INDEX mv_public_issues_safe_id_idx ON mv_public_issues_safe(id);
CREATE INDEX mv_public_issues_safe_area_pincode_idx ON mv_public_issues_safe(area_id, pincode_code);

DROP MATERIALIZED VIEW IF EXISTS mv_cluster_priority;
CREATE MATERIALIZED VIEW mv_cluster_priority AS
SELECT id, area_id, pincode_code, category, title, priority_score, status, updated_at
FROM issue_clusters
WHERE visibility = 'public';
CREATE UNIQUE INDEX mv_cluster_priority_id_idx ON mv_cluster_priority(id);

DROP MATERIALIZED VIEW IF EXISTS mv_pincode_aggregates;
CREATE MATERIALIZED VIEW mv_pincode_aggregates AS
SELECT
  pincode_code,
  count(*)::integer AS report_count,
  count(*) FILTER (WHERE status = 'resolved')::integer AS resolved_report_count,
  count(DISTINCT cluster_id) FILTER (WHERE cluster_id IS NOT NULL)::integer AS cluster_count,
  max(updated_at) AS last_updated
FROM mv_public_issues_safe
WHERE pincode_code IS NOT NULL
GROUP BY pincode_code;
CREATE UNIQUE INDEX mv_pincode_aggregates_pincode_code_idx ON mv_pincode_aggregates(pincode_code);

DROP MATERIALIZED VIEW IF EXISTS mv_area_dashboard_summary;
CREATE MATERIALIZED VIEW mv_area_dashboard_summary AS
SELECT
  area_id,
  count(*)::integer AS report_count,
  count(DISTINCT cluster_id) FILTER (WHERE cluster_id IS NOT NULL)::integer AS cluster_count,
  count(*) FILTER (WHERE status = 'resolved')::integer AS resolved_report_count,
  max(updated_at) AS last_updated
FROM mv_public_issues_safe
WHERE area_id IS NOT NULL
GROUP BY area_id;
CREATE UNIQUE INDEX mv_area_dashboard_summary_area_id_idx ON mv_area_dashboard_summary(area_id);

DROP MATERIALIZED VIEW IF EXISTS mv_audit_summary;
CREATE MATERIALIZED VIEW mv_audit_summary AS
SELECT date_trunc('day', created_at) AS day, event_type, count(*)::integer AS event_count
FROM audit_events
GROUP BY date_trunc('day', created_at), event_type;
CREATE UNIQUE INDEX mv_audit_summary_day_event_type_idx ON mv_audit_summary(day, event_type);

-- The operator creates the NOLOGIN group role before migration and grants it
-- only to the Metabase login. This conditional block keeps application
-- migrations usable by non-superuser database owners while ensuring the BI
-- boundary is explicit when the role exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tgim_bi_reader') THEN
    GRANT USAGE ON SCHEMA public TO tgim_bi_reader;
    GRANT SELECT ON mv_public_issues_safe, mv_cluster_priority,
      mv_pincode_aggregates, mv_area_dashboard_summary, mv_audit_summary
      TO tgim_bi_reader;
  END IF;
END $$;
