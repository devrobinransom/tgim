-- M1/M2 release-gate primitives: audience visibility, immutable publication
-- metadata, public dispute outcomes, and server-owned scope grants.
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(20) NOT NULL DEFAULT 'public';
ALTER TABLE "issue_clusters" ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(20) NOT NULL DEFAULT 'public';
ALTER TABLE "manifestos" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ(6);
ALTER TABLE "manifestos" ADD COLUMN IF NOT EXISTS "published_by" UUID REFERENCES "users"("id");
ALTER TABLE "delivery_disputes" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "delivery_disputes" ADD COLUMN IF NOT EXISTS "public_rationale" TEXT;
ALTER TABLE "delivery_disputes" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "actor_scope_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scope_type" VARCHAR(50) NOT NULL,
  "scope_id" VARCHAR(255) NOT NULL,
  "capabilities" TEXT[] NOT NULL,
  "issued_by" UUID NOT NULL REFERENCES "users"("id"),
  "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "actor_scope_grants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "actor_scope_grants_actor_scope_idx" ON "actor_scope_grants"("actor_id", "scope_type", "scope_id");
CREATE INDEX IF NOT EXISTS "actor_scope_grants_scope_active_idx" ON "actor_scope_grants"("scope_type", "scope_id", "revoked_at");
