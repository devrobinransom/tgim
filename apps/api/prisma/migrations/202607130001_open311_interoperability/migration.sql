CREATE TABLE IF NOT EXISTS civic_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  jurisdiction_area_id UUID REFERENCES areas(id),
  category VARCHAR(50) NOT NULL,
  service_code VARCHAR(100) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  description TEXT,
  open311_endpoint VARCHAR(512),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction_area_id, category, service_code)
);

CREATE INDEX IF NOT EXISTS civic_authorities_category_active_idx ON civic_authorities(category, active);

CREATE TABLE IF NOT EXISTS external_grievance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES issue_clusters(id),
  authority_id UUID NOT NULL REFERENCES civic_authorities(id),
  provider VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  service_code VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  status_notes TEXT,
  public_url VARCHAR(512),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS external_grievance_cases_issue_status_idx ON external_grievance_cases(issue_id, status);
CREATE INDEX IF NOT EXISTS external_grievance_cases_cluster_status_idx ON external_grievance_cases(cluster_id, status);
