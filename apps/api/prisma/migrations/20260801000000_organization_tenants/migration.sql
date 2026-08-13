-- Tenant boundary for government, utility, NGO, party, volunteer, and research recipients.
CREATE TYPE "OrganizationKind" AS ENUM ('government', 'utility', 'ngo', 'party', 'volunteer_group', 'research_institution', 'platform');
CREATE TYPE "OrganizationRole" AS ENUM ('owner', 'admin', 'officer', 'researcher', 'member');

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "kind" "OrganizationKind" NOT NULL,
  "verified_at" TIMESTAMPTZ(6),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_memberships_organization_id_user_id_key" UNIQUE ("organization_id", "user_id")
);

CREATE TABLE "organization_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "invitee_email" VARCHAR(255) NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'member',
  "token_hash" CHAR(64) NOT NULL,
  "invited_by" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_invitations_token_hash_key" UNIQUE ("token_hash")
);

CREATE UNIQUE INDEX "organizations_name_kind_key" ON "organizations"("name", "kind");
CREATE INDEX "organization_memberships_user_id_role_idx" ON "organization_memberships"("user_id", "role");
CREATE INDEX "organization_invitations_organization_id_invitee_email_idx" ON "organization_invitations"("organization_id", "invitee_email");
CREATE INDEX "organization_invitations_expires_at_idx" ON "organization_invitations"("expires_at");

ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "report_sharing_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "issue_id" UUID NOT NULL,
  "authority_id" UUID NOT NULL,
  "granted_by" UUID NOT NULL,
  "purpose" VARCHAR(100) NOT NULL,
  "expires_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_sharing_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_sharing_consents_issue_id_authority_id_granted_by_purpose_key" UNIQUE ("issue_id", "authority_id", "granted_by", "purpose")
);
CREATE INDEX "report_sharing_consents_issue_id_authority_id_revoked_at_idx" ON "report_sharing_consents"("issue_id", "authority_id", "revoked_at");
ALTER TABLE "report_sharing_consents" ADD CONSTRAINT "report_sharing_consents_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_sharing_consents" ADD CONSTRAINT "report_sharing_consents_authority_id_fkey" FOREIGN KEY ("authority_id") REFERENCES "civic_authorities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_sharing_consents" ADD CONSTRAINT "report_sharing_consents_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
