export type UserRole = 'citizen' | 'volunteer' | 'party_lead' | 'department_officer' | 'platform_moderator' | 'platform_admin';

export type IssueCategory = 'water' | 'roads' | 'garbage' | 'health' | 'safety' | 'jobs' | 'transport' | 'housing';

export type IssueStatus = 'open' | 'duplicate' | 'clustered' | 'resolved' | 'hidden';
export type Visibility = 'internal' | 'public' | 'hidden';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PrivacyLevel = 'public' | 'anonymous' | 'blurred';

export type PromiseStatus = 'draft' | 'published' | 'adopted' | 'completed' | 'on_track' | 'delayed' | 'disputed' | 'deferred' | 'rejected' | 'no_update';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type DisputeStatus = 'open' | 'needs_information' | 'upheld' | 'rejected';
export type NotificationChannel = 'in_app' | 'email' | 'push';
export type ExternalCaseStatus = 'new' | 'open' | 'acknowledged' | 'in_progress' | 'closed' | 'rejected' | 'appealed';
export type PromiseMilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'disputed';
export type CitizenVerdictValue = 'delivered' | 'partly_delivered' | 'not_delivered' | 'not_sure';

export interface User {
  id: string;
  identity_issuer?: string;
  identity_subject?: string;
  home_area_id?: string;
  /** @deprecated Compatibility only while legacy Clerk identities are migrated. */
  clerk_user_id?: string;
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
  type: 'state' | 'district' | 'constituency' | 'ward' | 'pincode';
  parent_id?: string;
  boundary?: any; // GeoJSON geometry representation
  created_at: Date;
}

export interface PincodeBoundary {
  id: string;
  pincode_code: string; // 6-digit Indian PIN code
  name: string;
  area_id?: string;
  centroid_latitude: number;
  centroid_longitude: number;
  boundary?: any; // GeoJSON Polygon geometry for ST_Within lookups
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
  visibility: Visibility;
  created_at: Date;
  updated_at: Date;
  pincode_code?: string;
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
  visibility: Visibility;
  idempotency_key?: string;
  pincode_code?: string;
  created_at: Date;
  updated_at: Date;
}

export type PublicIssue = Omit<Issue, 'reporter_id' | 'exact_latitude' | 'exact_longitude' | 'idempotency_key'>;

export interface CivicAuthority {
  id: string;
  name: string;
  jurisdiction_area_id?: string;
  category: IssueCategory;
  service_code: string;
  service_name: string;
  description?: string;
  open311_endpoint?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalGrievanceCase {
  id: string;
  issue_id: string;
  cluster_id?: string;
  authority_id: string;
  authority_name?: string;
  provider: string;
  external_id: string;
  service_code: string;
  status: ExternalCaseStatus;
  status_notes?: string;
  public_url?: string;
  submitted_at: Date;
  closed_at?: Date;
  last_synced_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalCaseDocument {
  id: string;
  external_case_id: string;
  title: string;
  document_url: string;
  media_type?: string;
  is_public: boolean;
  created_at: Date;
}

export interface ExternalCaseAppeal {
  id: string;
  external_case_id: string;
  raised_by: string;
  reason: string;
  evidence_url?: string;
  external_appeal_id?: string;
  status: 'submitted' | 'acknowledged' | 'resolved' | 'rejected';
  response_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IssueAccountabilityRecord {
  issue: PublicIssue;
  official_cases: ExternalGrievanceCase[];
  independent_status: IssueStatus;
  official_status_summary: Record<ExternalCaseStatus, number>;
}

export interface VolunteerApplication {
  id: string;
  user_id: string;
  motivation: string;
  languages: string[];
  status: ReviewStatus;
  reviewed_by?: string;
  review_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryDispute {
  id: string;
  party_promise_id: string;
  delivery_update_id?: string;
  raised_by: string;
  reason: string;
  evidence_url: string;
  status: DisputeStatus;
  resolution_notes?: string;
  resolved_by?: string;
  is_public?: boolean;
  public_rationale?: string;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/** Deliberately limited public record of a resolved delivery dispute. */
export interface PublicDisputeOutcome {
  id: string;
  party_promise_id: string;
  status: Exclude<DisputeStatus, 'open'>;
  rationale: string;
  published_at: Date;
}

export interface NotificationPreference {
  user_id: string;
  channels: NotificationChannel[];
  saved_area_ids: string[];
  issue_updates: boolean;
  promise_updates: boolean;
  language: string;
  updated_at: Date;
  push_token?: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read_at?: Date;
  created_at: Date;
}

export interface ModerationAction {
  id: string;
  target_table: 'issues' | 'issue_clusters' | 'delivery_disputes';
  target_id: string;
  action: 'hide' | 'restore' | 'mark_duplicate' | 'merge' | 'dismiss';
  reason: string;
  actor_id: string;
  created_at: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  last_updated: Date;
}

export interface AreaDashboardSummary {
  area_id: string;
  report_count: number;
  support_count: number;
  verified_cluster_count: number;
  manifesto_ready: boolean;
  adopted_promise_count: number;
  completed_promise_count: number;
  category_mix: Record<string, number>;
  status_mix: Record<string, number>;
  last_updated: Date;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';
export interface BackgroundJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_after: Date;
  locked_at?: Date;
  last_error?: string;
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

export interface EvidenceUploadResult {
  media_url: string;
  media_type: string;
  media_hash: string;
  width: number;
  height: number;
  bytes: number;
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

export interface PartyMembership {
  id: string;
  user_id: string;
  party_id: string;
  title: string;
  is_approved: boolean;
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

export interface VerificationAssignment {
  id: string;
  cluster_id: string;
  volunteer_id: string;
  status: 'assigned' | 'accepted' | 'completed' | 'cancelled';
  safety_notes?: string;
  due_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Manifesto {
  id: string;
  area_id: string;
  version: number;
  is_published: boolean;
  published_at?: Date;
  published_by?: string;
  created_at: Date;
  updated_at: Date;
  generation_provider?: string;
  generation_model?: string;
  source_cluster_ids?: string[];
  pincode_code?: string;
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

/** Privacy-safe public evidence record for one issue cluster. */
export interface PublicClusterDetail {
  cluster: IssueCluster;
  issues: PublicIssue[];
  report_count: number;
  support_count: number;
  severity_mix: Partial<Record<IssueSeverity, number>>;
  verifications: Array<Omit<VerificationEvent, 'verifier_id'>>;
  last_updated: Date;
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
  owner_department?: string;
  estimated_cost?: string;
  feasibility_notes?: string;
}

export interface PromiseMilestone {
  id: string;
  party_promise_id: string;
  title: string;
  description?: string;
  sequence: number;
  due_at?: Date;
  completed_at?: Date;
  status: PromiseMilestoneStatus;
  evidence_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CitizenPromiseVerdict {
  id: string;
  party_promise_id: string;
  user_id: string;
  verdict: CitizenVerdictValue;
  evidence_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PromiseOutcomeScore {
  score: number;
  label: 'no_evidence' | 'at_risk' | 'partial' | 'on_track' | 'delivered';
  milestone_progress: number;
  evidence_strength: number;
  timeliness: number;
  citizen_confidence: number;
  verdict_counts: Record<CitizenVerdictValue, number>;
  calculated_at: Date;
}

export interface PromiseAccountabilityRecord {
  promise: PartyPromise;
  milestones: PromiseMilestone[];
  delivery_updates: DeliveryUpdate[];
  source_cluster_ids: string[];
  official_cases: ExternalGrievanceCase[];
  public_disputes: PublicDisputeOutcome[];
  outcome: PromiseOutcomeScore;
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

export type { SovereigntyConfig } from './tokens.js';

/**
 * Returns true when India Sovereignty Mode is active.
 * Reads SOVEREIGNTY_MODE env var (browser-safe — uses globalThis check).
 */
export function isSovereignMode(): boolean {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
    __sovereigntyMode?: boolean;
  };
  if (g.process?.env?.SOVEREIGNTY_MODE === 'sovereign') return true;
  if (g.process?.env?.NEXT_PUBLIC_SOVEREIGNTY_MODE === 'sovereign') return true;
  return false;
}

export interface OutboxEvent {
  event_id: string;
  entity_type: string;
  entity_id: string;
  event_type?: string;
  payload?: unknown;
  schema_version?: number;
  occurred_at?: Date;
}

export type ActorScopeType = 'platform' | 'party' | 'organization' | 'authority' | 'department' | 'area' | 'research_institution';

export interface ActorScopeGrant {
  id: string;
  actor_id: string;
  scope_type: ActorScopeType;
  scope_id: string;
  capabilities: string[];
  issued_by: string;
  starts_at: Date;
  ends_at?: Date;
  revoked_at?: Date;
  created_at: Date;
}

export interface JobPublisher {
  publish(event: OutboxEvent): Promise<string>;
}

/** A recipient tenant: authority, utility, NGO, party, volunteer group, or research institution. */
export type OrganizationKind = 'government' | 'utility' | 'ngo' | 'party' | 'volunteer_group' | 'research_institution' | 'platform';
export type OrganizationRole = 'owner' | 'admin' | 'officer' | 'researcher' | 'member';

export interface Organization {
  id: string;
  name: string;
  kind: OrganizationKind;
  verified_at?: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  invitee_email: string;
  role: OrganizationRole;
  token_hash: string;
  invited_by: string;
  expires_at: Date;
  accepted_at?: Date;
  created_at: Date;
}

export type FormLifecycle = 'draft' | 'published' | 'retired';
export type FormQuestionType = 'text' | 'long_text' | 'number' | 'single_select' | 'multi_select' | 'rating' | 'boolean' | 'evidence';

export interface CivicForm {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: FormLifecycle;
  active_version: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CivicFormQuestion {
  key: string;
  label: string;
  type: FormQuestionType;
  required: boolean;
  position: number;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
}

export interface CivicFormVersion {
  id: string;
  form_id: string;
  version: number;
  status: FormLifecycle;
  questions: CivicFormQuestion[];
  published_at?: Date;
  created_by: string;
  created_at: Date;
}

export interface CivicFormResponseSession {
  id: string;
  form_version_id: string;
  actor_id: string;
  area_id?: string;
  idempotency_key: string;
  state: 'submitted' | 'accepted' | 'rejected';
  answers: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type PollType = 'single_choice' | 'ranked_choice' | 'likert' | 'budget_allocation';
export type PollLifecycle = 'draft' | 'published' | 'closed';

export interface CivicPollOption {
  id: string;
  poll_id: string;
  label: string;
  value: string;
  position: number;
}

export interface CivicPoll {
  id: string;
  area_id: string;
  question: string;
  description?: string;
  type: PollType;
  status: PollLifecycle;
  starts_at: Date;
  ends_at: Date;
  eligibility?: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  options?: CivicPollOption[];
}

export interface CivicPollVote {
  id: string;
  poll_id: string;
  actor_id: string;
  option_id?: string;
  ranking?: string[];
  allocation?: Record<string, number>;
  value?: number;
  idempotency_key: string;
  created_at: Date;
}

export interface CivicPollResults {
  poll_id: string;
  sample_size: number;
  suppressed: boolean;
  counts: Array<{ option_id: string; label: string; count: number; percentage: number }>;
  generated_at: Date;
}

export interface OpenProjectMapping {
  id: string;
  party_promise_id: string;
  project_identifier: string;
  work_package_id?: string;
  status: 'pending' | 'synced' | 'failed';
  last_safe_error?: string;
  last_synced_at?: Date;
  created_at: Date;
  updated_at: Date;
}
