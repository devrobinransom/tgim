import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'citizen',
  'volunteer',
  'party_lead',
  'department_officer',
  'platform_moderator',
  'platform_admin',
]);

export const OrganizationKindSchema = z.enum(['government', 'utility', 'ngo', 'party', 'volunteer_group', 'research_institution', 'platform']);
export const OrganizationRoleSchema = z.enum(['owner', 'admin', 'officer', 'researcher', 'member']);
export const ActorScopeTypeSchema = z.enum(['platform', 'party', 'organization', 'authority', 'department', 'area', 'research_institution']);

export const CreateScopeGrantSchema = z.object({
  actor_id: z.string(),
  scope_type: ActorScopeTypeSchema,
  scope_id: z.string(),
  capabilities: z.array(z.string().min(2).max(100)).min(1).max(30),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
  kind: OrganizationKindSchema,
});

export const CreateOrganizationInvitationSchema = z.object({
  invitee_email: z.string().email().max(255),
  role: OrganizationRoleSchema,
  expires_in_hours: z.number().int().min(1).max(24 * 30).default(24 * 7),
});

export const AcceptOrganizationInvitationSchema = z.object({
  token: z.string().min(32).max(512),
});

export const IssueCategorySchema = z.enum([
  'water',
  'roads',
  'garbage',
  'health',
  'safety',
  'jobs',
  'transport',
  'housing',
]);

export const IssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const PrivacyLevelSchema = z.enum(['public', 'anonymous', 'blurred']);

export const CreateIssueSchema = z.object({
  category: IssueCategorySchema,
  description: z.string().min(10, 'Description must be at least 10 characters long').max(2000),
  severity: IssueSeveritySchema,
  privacy: PrivacyLevelSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  media: z.array(
    z.object({
      media_url: z.string().url(),
      media_type: z.string(),
      media_hash: z.string(),
    })
  ).max(5).optional(),
  idempotency_key: z.string().min(1),
  pincode_code: z.string().regex(/^\d{6}$/).optional(),
});

export const SubmitVerificationSchema = z.object({
  cluster_id: z.string().uuid(),
  outcome: z.enum(['verified', 'insufficient_evidence', 'duplicate', 'rejected']),
  notes: z.string().max(1000).optional(),
  checklist: z.record(z.boolean()),
});

export const AdoptPromiseSchema = z.object({
  source_promise_id: z.string().uuid(),
  adopted_title: z.string().min(5).max(255),
  adopted_description: z.string().min(10).max(2000),
  target_metric: z.string().min(2).max(255),
  timeline: z.string().datetime(), // ISO Date String
});

export const AddDeliveryUpdateSchema = z.object({
  party_promise_id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'adopted', 'completed', 'on_track', 'delayed', 'disputed', 'deferred', 'rejected', 'no_update']),
  update_text: z.string().min(10).max(2000),
  evidence_url: z.string().url().optional(),
});

export const UpdatePartyPromiseSchema = z.object({
  adopted_title: z.string().min(5).max(255).optional(),
  adopted_description: z.string().min(10).max(2000).optional(),
  target_metric: z.string().min(2).max(255).optional(),
  timeline: z.string().datetime().optional(),
  status: z.enum(['adopted', 'published', 'deferred', 'rejected']).optional(),
  owner_department: z.string().min(2).max(150).optional(),
  estimated_cost: z.string().min(1).max(100).optional(),
  feasibility_notes: z.string().max(2000).optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one field is required');

export const ApplyVolunteerSchema = z.object({
  motivation: z.string().min(20).max(2000),
  languages: z.array(z.string().min(2).max(10)).min(1).max(5),
});

export const ReviewVolunteerSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_notes: z.string().max(1000).optional(),
});

export const PublishManifestoSchema = z.object({
  confirmation: z.literal(true),
});

export const CreateDisputeSchema = z.object({
  party_promise_id: z.string().uuid(),
  delivery_update_id: z.string().uuid().optional(),
  reason: z.string().min(20).max(2000),
  evidence_url: z.string().url(),
});

export const ResolveDisputeSchema = z.object({
  status: z.enum(['needs_information', 'upheld', 'rejected']),
  resolution_notes: z.string().min(10).max(2000),
  publish_outcome: z.boolean().default(false),
  public_rationale: z.string().min(10).max(1000).optional(),
}).superRefine((value, ctx) => {
  if (value.publish_outcome && !value.public_rationale) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Published outcomes require a public rationale', path: ['public_rationale'] });
  }
});

export const NotificationPreferenceSchema = z.object({
  channels: z.array(z.enum(['in_app', 'email', 'push'])).min(1),
  saved_area_ids: z.array(z.string()).max(20),
  issue_updates: z.boolean(),
  promise_updates: z.boolean(),
  language: z.enum(['en', 'hi', 'mr']),
  push_token: z.string().max(255).optional(),
});

export const ModerationActionSchema = z.object({
  target_table: z.enum(['issues', 'issue_clusters', 'delivery_disputes']),
  target_id: z.string(),
  action: z.enum(['hide', 'restore', 'mark_duplicate', 'merge', 'dismiss']),
  reason: z.string().min(10).max(1000),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export const UploadEvidenceSchema = z.object({
  filename: z.string().min(1).max(255),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  base64: z.string().min(16).max(20_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const AssignPartyMemberSchema = z.object({
  user_id: z.string(),
  party_id: z.string(),
  title: z.string().min(2).max(100),
});

export const AssignVerificationSchema = z.object({
  cluster_id: z.string().uuid(),
  volunteer_id: z.string(),
  safety_notes: z.string().max(1000).optional(),
  due_at: z.string().datetime().optional(),
});

export const UpdateVerificationAssignmentSchema = z.object({ status: z.enum(['accepted', 'completed']) });

export const ExternalCaseStatusSchema = z.enum(['new', 'open', 'acknowledged', 'in_progress', 'closed', 'rejected', 'appealed']);

export const CreateAuthoritySchema = z.object({
  name: z.string().min(2).max(255),
  jurisdiction_area_id: z.string().optional(),
  category: IssueCategorySchema,
  service_code: z.string().min(1).max(100),
  service_name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  open311_endpoint: z.string().url().optional(),
  active: z.boolean().default(true),
});

export const LinkExternalCaseSchema = z.object({
  authority_id: z.string().uuid(),
  provider: z.string().min(2).max(50),
  external_id: z.string().min(1).max(255),
  service_code: z.string().min(1).max(100),
  status: ExternalCaseStatusSchema.default('open'),
  status_notes: z.string().max(2000).optional(),
  public_url: z.string().url().optional(),
  submitted_at: z.string().datetime().optional(),
});

export const UpdateExternalCaseSchema = z.object({
  status: ExternalCaseStatusSchema,
  status_notes: z.string().max(2000).optional(),
  public_url: z.string().url().optional(),
  closed_at: z.string().datetime().optional(),
}).refine(value => value.status !== 'closed' || Boolean(value.closed_at), 'Closed cases require closed_at');

export const Open311CreateRequestSchema = z.object({
  service_code: z.string().min(1),
  description: z.string().min(10).max(2000),
  lat: z.coerce.number().min(-90).max(90),
  long: z.coerce.number().min(-180).max(180),
  media_url: z.string().url().optional(),
  attribute: z.record(z.string()).optional(),
});

export const SubmitToAuthoritySchema = z.object({
  authority_id: z.string().uuid(),
});

export const GrantIssueSharingConsentSchema = z.object({
  authority_id: z.string().uuid(),
  purpose: z.literal('external_case_submission'),
  expires_at: z.string().datetime().optional(),
});

export const CreateExternalCaseAppealSchema = z.object({
  reason: z.string().min(20).max(2000),
  evidence_url: z.string().url().optional(),
});

export const AddExternalCaseDocumentSchema = z.object({
  title: z.string().min(2).max(255),
  document_url: z.string().url(),
  media_type: z.string().max(100).optional(),
  is_public: z.boolean().default(true),
});

export const CreatePromiseMilestoneSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  sequence: z.number().int().min(1).max(20),
  due_at: z.string().datetime().optional(),
});

export const UpdatePromiseMilestoneSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'verified', 'disputed']),
  completed_at: z.string().datetime().optional(),
  evidence_url: z.string().url().optional(),
  description: z.string().max(2000).optional(),
}).refine(value => !['completed', 'verified'].includes(value.status) || Boolean(value.completed_at), 'Completed milestones require completed_at');

export const CitizenPromiseVerdictSchema = z.object({
  verdict: z.enum(['delivered', 'partly_delivered', 'not_delivered', 'not_sure']),
  evidence_url: z.string().url().optional(),
});

export const PincodeGeocodeSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const FormQuestionTypeSchema = z.enum(['text', 'long_text', 'number', 'single_select', 'multi_select', 'rating', 'boolean', 'evidence']);

export const CivicFormQuestionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  label: z.string().min(2).max(255),
  type: FormQuestionTypeSchema,
  required: z.boolean().default(false),
  position: z.number().int().min(0).max(500),
  options: z.array(z.object({ value: z.string().min(1).max(100), label: z.string().min(1).max(255) })).max(100).optional(),
  validation: z.record(z.unknown()).optional(),
});

export const CreateCivicFormSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  questions: z.array(CivicFormQuestionSchema).min(1).max(100),
}).superRefine((value, ctx) => {
  if (new Set(value.questions.map(question => question.key)).size !== value.questions.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['questions'], message: 'Question keys must be unique' });
  }
});

export const SubmitCivicFormSchema = z.object({
  idempotency_key: z.string().uuid(),
  area_id: z.string().optional(),
  answers: z.record(z.unknown()),
});

export const PollTypeSchema = z.enum(['single_choice', 'ranked_choice', 'likert', 'budget_allocation']);

export const CreateCivicPollSchema = z.object({
  area_id: z.string().min(1),
  question: z.string().min(5).max(500),
  description: z.string().max(2000).optional(),
  type: PollTypeSchema,
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  options: z.array(z.object({ label: z.string().min(1).max(255), value: z.string().min(1).max(100) })).min(2).max(50),
  eligibility: z.record(z.unknown()).optional(),
}).refine(value => new Date(value.ends_at) > new Date(value.starts_at), { path: ['ends_at'], message: 'Poll must end after it starts' });

export const CastCivicPollVoteSchema = z.object({
  idempotency_key: z.string().uuid(),
  option_id: z.string().uuid().optional(),
  ranking: z.array(z.string().uuid()).min(2).max(50).optional(),
  allocation: z.record(z.number().int().min(0).max(100)).optional(),
  value: z.number().int().min(1).max(5).optional(),
}).refine(value => [value.option_id, value.ranking, value.allocation, value.value].filter(item => item !== undefined).length === 1, {
  message: 'Exactly one vote payload is required',
});
