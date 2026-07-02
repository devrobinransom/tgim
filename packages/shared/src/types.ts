export type UserRole = 'citizen' | 'volunteer' | 'party_lead' | 'department_officer' | 'platform_moderator' | 'platform_admin';

export type IssueCategory = 'water' | 'roads' | 'garbage' | 'health' | 'safety' | 'jobs' | 'transport' | 'housing';

export type IssueStatus = 'open' | 'duplicate' | 'clustered' | 'resolved' | 'hidden';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PrivacyLevel = 'public' | 'anonymous' | 'blurred';

export type PromiseStatus = 'draft' | 'published' | 'adopted' | 'completed' | 'on_track' | 'delayed' | 'disputed';

export interface User {
  id: string;
  phone_number?: string;
  email?: string;
  display_name?: string;
  role: UserRole;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
}

export interface Area {
  id: string;
  name: string;
  type: 'state' | 'district' | 'constituency' | 'ward';
  parent_id?: string;
  boundary?: any; // GeoJSON geometry representation
  created_at: Date;
}

export interface IssueCluster {
  id: string;
  area_id: string;
  category: string;
  title: string;
  summary?: string;
  priority_score: number;
  status: 'draft' | 'verified' | 'manifesto_ready' | 'resolved';
  created_at: Date;
  updated_at: Date;
}

export interface Issue {
  id: string;
  reporter_id?: string;
  cluster_id?: string;
  area_id?: string;
  category: string;
  description: string;
  severity: IssueSeverity;
  privacy: PrivacyLevel;
  exact_latitude: number;
  exact_longitude: number;
  public_latitude: number;
  public_longitude: number;
  status: IssueStatus;
  idempotency_key?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IssueMedia {
  id: string;
  issue_id: string;
  media_url: string;
  media_type: string;
  media_hash: string;
  is_processed: boolean;
  created_at: Date;
}

export interface IssueSupport {
  id: string;
  user_id: string;
  issue_id: string;
  created_at: Date;
}

export interface PartyProfile {
  id: string;
  name: string;
  official_logo_url?: string;
  is_verified: boolean;
  created_at: Date;
}

export interface VerificationEvent {
  id: string;
  cluster_id: string;
  verifier_id: string;
  outcome: 'verified' | 'insufficient_evidence' | 'duplicate' | 'rejected';
  notes?: string;
  checklist: Record<string, boolean>;
  created_at: Date;
}

export interface Manifesto {
  id: string;
  area_id: string;
  version: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ManifestoPromise {
  id: string;
  manifesto_id: string;
  cluster_id?: string;
  time_horizon: '100-day' | '1-year' | '3-year' | '5-year';
  title: string;
  description: string;
  target_metric?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PartyPromise {
  id: string;
  party_id: string;
  source_promise_id: string;
  adopted_title: string;
  adopted_description: string;
  target_metric: string;
  timeline: Date;
  status: PromiseStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryUpdate {
  id: string;
  party_promise_id: string;
  updater_id: string;
  status: PromiseStatus;
  update_text: string;
  evidence_url?: string;
  created_at: Date;
}

export interface AuditEvent {
  id: string;
  actor_id?: string;
  event_type: string;
  target_table: string;
  target_id: string;
  payload?: any;
  created_at: Date;
}
