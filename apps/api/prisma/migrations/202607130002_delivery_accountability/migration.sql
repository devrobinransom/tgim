CREATE TABLE external_case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), external_case_id UUID NOT NULL REFERENCES external_grievance_cases(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, document_url VARCHAR(512) NOT NULL, media_type VARCHAR(100), is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE external_case_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), external_case_id UUID NOT NULL REFERENCES external_grievance_cases(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES users(id), reason TEXT NOT NULL, evidence_url VARCHAR(512), external_appeal_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted', response_notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX external_case_appeals_external_case_status_idx ON external_case_appeals(external_case_id, status);

CREATE TABLE promise_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), party_promise_id UUID NOT NULL REFERENCES party_promises(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, description TEXT, sequence INTEGER NOT NULL, due_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', evidence_url VARCHAR(512), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(party_promise_id, sequence)
);

CREATE TABLE citizen_promise_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), party_promise_id UUID NOT NULL REFERENCES party_promises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, verdict VARCHAR(30) NOT NULL, evidence_url VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(party_promise_id, user_id)
);
CREATE INDEX citizen_promise_verdicts_promise_verdict_idx ON citizen_promise_verdicts(party_promise_id, verdict);
