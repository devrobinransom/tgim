-- Required by UUID defaults and geospatial/vector columns in the baseline schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('citizen', 'volunteer', 'party_lead', 'department_officer', 'platform_moderator', 'platform_admin');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'duplicate', 'clustered', 'resolved', 'hidden');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('public', 'anonymous', 'blurred');

-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('draft', 'published', 'adopted', 'completed', 'on_track', 'delayed', 'disputed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(15),
    "email" VARCHAR(255),
    "display_name" VARCHAR(100),
    "role" "UserRole" NOT NULL DEFAULT 'citizen',
    "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "parent_id" UUID,
    "boundary" geometry(Geometry, 4326),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_clusters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID,
    "cluster_id" UUID,
    "area_id" UUID,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "description_embedding" vector(1536),
    "severity" "IssueSeverity" NOT NULL DEFAULT 'medium',
    "privacy" "PrivacyLevel" NOT NULL DEFAULT 'public',
    "exact_location" geometry(Point, 4326) NOT NULL,
    "public_location" geometry(Point, 4326) NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issue_id" UUID NOT NULL,
    "media_url" VARCHAR(512) NOT NULL,
    "media_type" VARCHAR(50) NOT NULL,
    "media_hash" VARCHAR(64) NOT NULL,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_supports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_supports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cluster_id" UUID NOT NULL,
    "verifier_id" UUID NOT NULL,
    "outcome" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "checklist" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifestos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifesto_promises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manifesto_id" UUID NOT NULL,
    "cluster_id" UUID,
    "time_horizon" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "target_metric" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifesto_promises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "official_logo_url" VARCHAR(512),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_promises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_id" UUID NOT NULL,
    "source_promise_id" UUID NOT NULL,
    "adopted_title" VARCHAR(255) NOT NULL,
    "adopted_description" TEXT NOT NULL,
    "target_metric" VARCHAR(255) NOT NULL,
    "timeline" TIMESTAMPTZ(6) NOT NULL,
    "status" "PromiseStatus" NOT NULL DEFAULT 'adopted',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_promises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "party_promise_id" UUID NOT NULL,
    "updater_id" UUID NOT NULL,
    "status" "PromiseStatus" NOT NULL,
    "update_text" TEXT NOT NULL,
    "evidence_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "target_table" VARCHAR(50) NOT NULL,
    "target_id" UUID NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "issues_idempotency_key_key" ON "issues"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "issue_supports_user_id_issue_id_key" ON "issue_supports"("user_id", "issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "manifestos_area_id_version_key" ON "manifestos"("area_id", "version");

-- CreateIndex
CREATE INDEX "audit_events_target_table_target_id_idx" ON "audit_events"("target_table", "target_id");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_clusters" ADD CONSTRAINT "issue_clusters_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "issue_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_supports" ADD CONSTRAINT "issue_supports_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "issue_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifestos" ADD CONSTRAINT "manifestos_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifesto_promises" ADD CONSTRAINT "manifesto_promises_manifesto_id_fkey" FOREIGN KEY ("manifesto_id") REFERENCES "manifestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifesto_promises" ADD CONSTRAINT "manifesto_promises_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "issue_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_promises" ADD CONSTRAINT "party_promises_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_promises" ADD CONSTRAINT "party_promises_source_promise_id_fkey" FOREIGN KEY ("source_promise_id") REFERENCES "manifesto_promises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_updates" ADD CONSTRAINT "delivery_updates_party_promise_id_fkey" FOREIGN KEY ("party_promise_id") REFERENCES "party_promises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_updates" ADD CONSTRAINT "delivery_updates_updater_id_fkey" FOREIGN KEY ("updater_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
