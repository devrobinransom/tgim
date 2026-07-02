"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDeliveryUpdateSchema = exports.AdoptPromiseSchema = exports.SubmitVerificationSchema = exports.CreateIssueSchema = exports.PrivacyLevelSchema = exports.IssueSeveritySchema = exports.IssueCategorySchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
exports.UserRoleSchema = zod_1.z.enum([
    'citizen',
    'volunteer',
    'party_lead',
    'department_officer',
    'platform_moderator',
    'platform_admin',
]);
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
    status: zod_1.z.enum(['draft', 'published', 'adopted', 'completed', 'on_track', 'delayed', 'disputed']),
    update_text: zod_1.z.string().min(10).max(2000),
    evidence_url: zod_1.z.string().url().optional(),
});
