import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'citizen',
  'volunteer',
  'party_lead',
  'department_officer',
  'platform_moderator',
  'platform_admin',
]);

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
  status: z.enum(['draft', 'published', 'adopted', 'completed', 'on_track', 'delayed', 'disputed']),
  update_text: z.string().min(10).max(2000),
  evidence_url: z.string().url().optional(),
});
