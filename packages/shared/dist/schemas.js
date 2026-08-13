"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CastCivicPollVoteSchema = exports.CreateCivicPollSchema = exports.PollTypeSchema = exports.SubmitCivicFormSchema = exports.CreateCivicFormSchema = exports.CivicFormQuestionSchema = exports.FormQuestionTypeSchema = exports.PincodeGeocodeSchema = exports.CitizenPromiseVerdictSchema = exports.UpdatePromiseMilestoneSchema = exports.CreatePromiseMilestoneSchema = exports.AddExternalCaseDocumentSchema = exports.CreateExternalCaseAppealSchema = exports.GrantIssueSharingConsentSchema = exports.SubmitToAuthoritySchema = exports.Open311CreateRequestSchema = exports.UpdateExternalCaseSchema = exports.LinkExternalCaseSchema = exports.CreateAuthoritySchema = exports.ExternalCaseStatusSchema = exports.UpdateVerificationAssignmentSchema = exports.AssignVerificationSchema = exports.AssignPartyMemberSchema = exports.UploadEvidenceSchema = exports.PaginationSchema = exports.ModerationActionSchema = exports.NotificationPreferenceSchema = exports.ResolveDisputeSchema = exports.CreateDisputeSchema = exports.PublishManifestoSchema = exports.ReviewVolunteerSchema = exports.ApplyVolunteerSchema = exports.UpdatePartyPromiseSchema = exports.AddDeliveryUpdateSchema = exports.AdoptPromiseSchema = exports.SubmitVerificationSchema = exports.CreateIssueSchema = exports.PrivacyLevelSchema = exports.IssueSeveritySchema = exports.IssueCategorySchema = exports.AcceptOrganizationInvitationSchema = exports.CreateOrganizationInvitationSchema = exports.CreateOrganizationSchema = exports.CreateScopeGrantSchema = exports.ActorScopeTypeSchema = exports.OrganizationRoleSchema = exports.OrganizationKindSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
exports.UserRoleSchema = zod_1.z.enum([
    'citizen',
    'volunteer',
    'party_lead',
    'department_officer',
    'platform_moderator',
    'platform_admin',
]);
exports.OrganizationKindSchema = zod_1.z.enum(['government', 'utility', 'ngo', 'party', 'volunteer_group', 'research_institution', 'platform']);
exports.OrganizationRoleSchema = zod_1.z.enum(['owner', 'admin', 'officer', 'researcher', 'member']);
exports.ActorScopeTypeSchema = zod_1.z.enum(['platform', 'party', 'organization', 'authority', 'department', 'area', 'research_institution']);
exports.CreateScopeGrantSchema = zod_1.z.object({
    actor_id: zod_1.z.string(),
    scope_type: exports.ActorScopeTypeSchema,
    scope_id: zod_1.z.string(),
    capabilities: zod_1.z.array(zod_1.z.string().min(2).max(100)).min(1).max(30),
    starts_at: zod_1.z.string().datetime().optional(),
    ends_at: zod_1.z.string().datetime().optional(),
});
exports.CreateOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255),
    kind: exports.OrganizationKindSchema,
});
exports.CreateOrganizationInvitationSchema = zod_1.z.object({
    invitee_email: zod_1.z.string().email().max(255),
    role: exports.OrganizationRoleSchema,
    expires_in_hours: zod_1.z.number().int().min(1).max(24 * 30).default(24 * 7),
});
exports.AcceptOrganizationInvitationSchema = zod_1.z.object({
    token: zod_1.z.string().min(32).max(512),
});
exports.IssueCategorySchema = zod_1.z.enum([
    'water',
    'roads',
    'garbage',
    'health',
    'safety',
    'jobs',
    'transport',
    'housing',
]);
exports.IssueSeveritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.PrivacyLevelSchema = zod_1.z.enum(['public', 'anonymous', 'blurred']);
exports.CreateIssueSchema = zod_1.z.object({
    category: exports.IssueCategorySchema,
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters long').max(2000),
    severity: exports.IssueSeveritySchema,
    privacy: exports.PrivacyLevelSchema,
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    media: zod_1.z.array(zod_1.z.object({
        media_url: zod_1.z.string().url(),
        media_type: zod_1.z.string(),
        media_hash: zod_1.z.string(),
    })).max(5).optional(),
    idempotency_key: zod_1.z.string().min(1),
    pincode_code: zod_1.z.string().regex(/^\d{6}$/).optional(),
});
exports.SubmitVerificationSchema = zod_1.z.object({
    cluster_id: zod_1.z.string().uuid(),
    outcome: zod_1.z.enum(['verified', 'insufficient_evidence', 'duplicate', 'rejected']),
    notes: zod_1.z.string().max(1000).optional(),
    checklist: zod_1.z.record(zod_1.z.boolean()),
});
exports.AdoptPromiseSchema = zod_1.z.object({
    source_promise_id: zod_1.z.string().uuid(),
    adopted_title: zod_1.z.string().min(5).max(255),
    adopted_description: zod_1.z.string().min(10).max(2000),
    target_metric: zod_1.z.string().min(2).max(255),
    timeline: zod_1.z.string().datetime(), // ISO Date String
});
exports.AddDeliveryUpdateSchema = zod_1.z.object({
    party_promise_id: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['draft', 'published', 'adopted', 'completed', 'on_track', 'delayed', 'disputed', 'deferred', 'rejected', 'no_update']),
    update_text: zod_1.z.string().min(10).max(2000),
    evidence_url: zod_1.z.string().url().optional(),
});
exports.UpdatePartyPromiseSchema = zod_1.z.object({
    adopted_title: zod_1.z.string().min(5).max(255).optional(),
    adopted_description: zod_1.z.string().min(10).max(2000).optional(),
    target_metric: zod_1.z.string().min(2).max(255).optional(),
    timeline: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(['adopted', 'published', 'deferred', 'rejected']).optional(),
    owner_department: zod_1.z.string().min(2).max(150).optional(),
    estimated_cost: zod_1.z.string().min(1).max(100).optional(),
    feasibility_notes: zod_1.z.string().max(2000).optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one field is required');
exports.ApplyVolunteerSchema = zod_1.z.object({
    motivation: zod_1.z.string().min(20).max(2000),
    languages: zod_1.z.array(zod_1.z.string().min(2).max(10)).min(1).max(5),
});
exports.ReviewVolunteerSchema = zod_1.z.object({
    status: zod_1.z.enum(['approved', 'rejected']),
    review_notes: zod_1.z.string().max(1000).optional(),
});
exports.PublishManifestoSchema = zod_1.z.object({
    confirmation: zod_1.z.literal(true),
});
exports.CreateDisputeSchema = zod_1.z.object({
    party_promise_id: zod_1.z.string().uuid(),
    delivery_update_id: zod_1.z.string().uuid().optional(),
    reason: zod_1.z.string().min(20).max(2000),
    evidence_url: zod_1.z.string().url(),
});
exports.ResolveDisputeSchema = zod_1.z.object({
    status: zod_1.z.enum(['needs_information', 'upheld', 'rejected']),
    resolution_notes: zod_1.z.string().min(10).max(2000),
    publish_outcome: zod_1.z.boolean().default(false),
    public_rationale: zod_1.z.string().min(10).max(1000).optional(),
}).superRefine((value, ctx) => {
    if (value.publish_outcome && !value.public_rationale) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Published outcomes require a public rationale', path: ['public_rationale'] });
    }
});
exports.NotificationPreferenceSchema = zod_1.z.object({
    channels: zod_1.z.array(zod_1.z.enum(['in_app', 'email', 'push'])).min(1),
    saved_area_ids: zod_1.z.array(zod_1.z.string()).max(20),
    issue_updates: zod_1.z.boolean(),
    promise_updates: zod_1.z.boolean(),
    language: zod_1.z.enum(['en', 'hi', 'mr']),
    push_token: zod_1.z.string().max(255).optional(),
});
exports.ModerationActionSchema = zod_1.z.object({
    target_table: zod_1.z.enum(['issues', 'issue_clusters', 'delivery_disputes']),
    target_id: zod_1.z.string(),
    action: zod_1.z.enum(['hide', 'restore', 'mark_duplicate', 'merge', 'dismiss']),
    reason: zod_1.z.string().min(10).max(1000),
});
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    page_size: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.UploadEvidenceSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1).max(255),
    media_type: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
    base64: zod_1.z.string().min(16).max(20_000_000),
    sha256: zod_1.z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
exports.AssignPartyMemberSchema = zod_1.z.object({
    user_id: zod_1.z.string(),
    party_id: zod_1.z.string(),
    title: zod_1.z.string().min(2).max(100),
});
exports.AssignVerificationSchema = zod_1.z.object({
    cluster_id: zod_1.z.string().uuid(),
    volunteer_id: zod_1.z.string(),
    safety_notes: zod_1.z.string().max(1000).optional(),
    due_at: zod_1.z.string().datetime().optional(),
});
exports.UpdateVerificationAssignmentSchema = zod_1.z.object({ status: zod_1.z.enum(['accepted', 'completed']) });
exports.ExternalCaseStatusSchema = zod_1.z.enum(['new', 'open', 'acknowledged', 'in_progress', 'closed', 'rejected', 'appealed']);
exports.CreateAuthoritySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255),
    jurisdiction_area_id: zod_1.z.string().optional(),
    category: exports.IssueCategorySchema,
    service_code: zod_1.z.string().min(1).max(100),
    service_name: zod_1.z.string().min(2).max(255),
    description: zod_1.z.string().max(1000).optional(),
    open311_endpoint: zod_1.z.string().url().optional(),
    active: zod_1.z.boolean().default(true),
});
exports.LinkExternalCaseSchema = zod_1.z.object({
    authority_id: zod_1.z.string().uuid(),
    provider: zod_1.z.string().min(2).max(50),
    external_id: zod_1.z.string().min(1).max(255),
    service_code: zod_1.z.string().min(1).max(100),
    status: exports.ExternalCaseStatusSchema.default('open'),
    status_notes: zod_1.z.string().max(2000).optional(),
    public_url: zod_1.z.string().url().optional(),
    submitted_at: zod_1.z.string().datetime().optional(),
});
exports.UpdateExternalCaseSchema = zod_1.z.object({
    status: exports.ExternalCaseStatusSchema,
    status_notes: zod_1.z.string().max(2000).optional(),
    public_url: zod_1.z.string().url().optional(),
    closed_at: zod_1.z.string().datetime().optional(),
}).refine(value => value.status !== 'closed' || Boolean(value.closed_at), 'Closed cases require closed_at');
exports.Open311CreateRequestSchema = zod_1.z.object({
    service_code: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10).max(2000),
    lat: zod_1.z.coerce.number().min(-90).max(90),
    long: zod_1.z.coerce.number().min(-180).max(180),
    media_url: zod_1.z.string().url().optional(),
    attribute: zod_1.z.record(zod_1.z.string()).optional(),
});
exports.SubmitToAuthoritySchema = zod_1.z.object({
    authority_id: zod_1.z.string().uuid(),
});
exports.GrantIssueSharingConsentSchema = zod_1.z.object({
    authority_id: zod_1.z.string().uuid(),
    purpose: zod_1.z.literal('external_case_submission'),
    expires_at: zod_1.z.string().datetime().optional(),
});
exports.CreateExternalCaseAppealSchema = zod_1.z.object({
    reason: zod_1.z.string().min(20).max(2000),
    evidence_url: zod_1.z.string().url().optional(),
});
exports.AddExternalCaseDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(255),
    document_url: zod_1.z.string().url(),
    media_type: zod_1.z.string().max(100).optional(),
    is_public: zod_1.z.boolean().default(true),
});
exports.CreatePromiseMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(255),
    description: zod_1.z.string().max(2000).optional(),
    sequence: zod_1.z.number().int().min(1).max(20),
    due_at: zod_1.z.string().datetime().optional(),
});
exports.UpdatePromiseMilestoneSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'verified', 'disputed']),
    completed_at: zod_1.z.string().datetime().optional(),
    evidence_url: zod_1.z.string().url().optional(),
    description: zod_1.z.string().max(2000).optional(),
}).refine(value => !['completed', 'verified'].includes(value.status) || Boolean(value.completed_at), 'Completed milestones require completed_at');
exports.CitizenPromiseVerdictSchema = zod_1.z.object({
    verdict: zod_1.z.enum(['delivered', 'partly_delivered', 'not_delivered', 'not_sure']),
    evidence_url: zod_1.z.string().url().optional(),
});
exports.PincodeGeocodeSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
});
exports.FormQuestionTypeSchema = zod_1.z.enum(['text', 'long_text', 'number', 'single_select', 'multi_select', 'rating', 'boolean', 'evidence']);
exports.CivicFormQuestionSchema = zod_1.z.object({
    key: zod_1.z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
    label: zod_1.z.string().min(2).max(255),
    type: exports.FormQuestionTypeSchema,
    required: zod_1.z.boolean().default(false),
    position: zod_1.z.number().int().min(0).max(500),
    options: zod_1.z.array(zod_1.z.object({ value: zod_1.z.string().min(1).max(100), label: zod_1.z.string().min(1).max(255) })).max(100).optional(),
    validation: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.CreateCivicFormSchema = zod_1.z.object({
    slug: zod_1.z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
    title: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().max(2000).optional(),
    questions: zod_1.z.array(exports.CivicFormQuestionSchema).min(1).max(100),
}).superRefine((value, ctx) => {
    if (new Set(value.questions.map(question => question.key)).size !== value.questions.length) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, path: ['questions'], message: 'Question keys must be unique' });
    }
});
exports.SubmitCivicFormSchema = zod_1.z.object({
    idempotency_key: zod_1.z.string().uuid(),
    area_id: zod_1.z.string().optional(),
    answers: zod_1.z.record(zod_1.z.unknown()),
});
exports.PollTypeSchema = zod_1.z.enum(['single_choice', 'ranked_choice', 'likert', 'budget_allocation']);
exports.CreateCivicPollSchema = zod_1.z.object({
    area_id: zod_1.z.string().min(1),
    question: zod_1.z.string().min(5).max(500),
    description: zod_1.z.string().max(2000).optional(),
    type: exports.PollTypeSchema,
    starts_at: zod_1.z.string().datetime(),
    ends_at: zod_1.z.string().datetime(),
    options: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string().min(1).max(255), value: zod_1.z.string().min(1).max(100) })).min(2).max(50),
    eligibility: zod_1.z.record(zod_1.z.unknown()).optional(),
}).refine(value => new Date(value.ends_at) > new Date(value.starts_at), { path: ['ends_at'], message: 'Poll must end after it starts' });
exports.CastCivicPollVoteSchema = zod_1.z.object({
    idempotency_key: zod_1.z.string().uuid(),
    option_id: zod_1.z.string().uuid().optional(),
    ranking: zod_1.z.array(zod_1.z.string().uuid()).min(2).max(50).optional(),
    allocation: zod_1.z.record(zod_1.z.number().int().min(0).max(100)).optional(),
    value: zod_1.z.number().int().min(1).max(5).optional(),
}).refine(value => [value.option_id, value.ranking, value.allocation, value.value].filter(item => item !== undefined).length === 1, {
    message: 'Exactly one vote payload is required',
});
