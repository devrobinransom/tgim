CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_user_id_key ON users(clerk_user_id);
ALTER TABLE manifestos ADD COLUMN IF NOT EXISTS generation_provider VARCHAR(50);
ALTER TABLE manifestos ADD COLUMN IF NOT EXISTS generation_model VARCHAR(100);
ALTER TABLE manifestos ADD COLUMN IF NOT EXISTS source_cluster_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TYPE "PromiseStatus" ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE "PromiseStatus" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "PromiseStatus" ADD VALUE IF NOT EXISTS 'no_update';
ALTER TABLE party_promises ADD COLUMN IF NOT EXISTS owner_department VARCHAR(150);
ALTER TABLE party_promises ADD COLUMN IF NOT EXISTS estimated_cost VARCHAR(100);
ALTER TABLE party_promises ADD COLUMN IF NOT EXISTS feasibility_notes TEXT;

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
  motivation TEXT NOT NULL, languages TEXT[] NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id), review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, channels TEXT[] NOT NULL,
  saved_area_ids TEXT[] NOT NULL, issue_updates BOOLEAN NOT NULL DEFAULT true,
  promise_updates BOOLEAN NOT NULL DEFAULT true, language VARCHAR(5) NOT NULL DEFAULT 'en',
  push_token VARCHAR(255), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), party_promise_id UUID NOT NULL REFERENCES party_promises(id) ON DELETE CASCADE,
  delivery_update_id UUID REFERENCES delivery_updates(id), raised_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL, evidence_url VARCHAR(512) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'open',
  resolution_notes TEXT, resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), target_table VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL, action VARCHAR(50) NOT NULL, reason TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type VARCHAR(100) NOT NULL, payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5, run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS background_jobs_status_run_after_idx ON background_jobs(status, run_after);

CREATE TABLE IF NOT EXISTS party_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES party_profiles(id) ON DELETE CASCADE, title VARCHAR(100) NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, party_id)
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, body TEXT NOT NULL, data JSONB, read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_id_read_at_created_at_idx ON user_notifications(user_id, read_at, created_at);

CREATE TABLE IF NOT EXISTS verification_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cluster_id UUID NOT NULL REFERENCES issue_clusters(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  safety_notes TEXT, due_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(cluster_id, volunteer_id)
);
