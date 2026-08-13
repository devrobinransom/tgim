import { z } from 'zod';

const UUID = z.string().uuid();

const payloads = {
  'cluster.score': z.object({ cluster_id: UUID }),
  'manifesto.generate': z.object({ area_id: z.string().min(1), actor_id: z.string().min(1) }),
  'external_case.submit': z.object({ issue_id: UUID, authority_id: UUID, actor_id: z.string().min(1) }),
  'external_case.poll': z.object({ external_case_id: UUID }),
  'notification.send': z.object({ user_id: z.string().min(1), title: z.string().min(1), body: z.string().min(1) }).passthrough(),
  'openproject.sync': z.object({ party_promise_id: UUID }),
} as const;

export type JobType = keyof typeof payloads;

export const OutboxEnvelopeSchema = z.object({
  event_id: UUID,
  event_type: z.enum(['cluster.score', 'manifesto.generate', 'external_case.submit', 'external_case.poll', 'notification.send', 'openproject.sync']),
  schema_version: z.literal(1),
  occurred_at: z.string().datetime(),
  data: z.record(z.unknown()),
});

export type OutboxEnvelope = z.infer<typeof OutboxEnvelopeSchema>;

export function validateJobPayload(type: string, payload: unknown): Record<string, unknown> {
  const schema = payloads[type as JobType];
  if (!schema) throw new Error(`Unsupported job type: ${type}`);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error(`Invalid ${type} job payload: ${parsed.error.issues.map(issue => issue.path.join('.') || issue.message).join(', ')}`);
  return parsed.data;
}

export function toOutboxEnvelope(event: { event_id: string; event_type: string; payload?: unknown; occurred_at?: Date; schema_version?: number }): OutboxEnvelope {
  const parsed = OutboxEnvelopeSchema.safeParse({
    event_id: event.event_id,
    event_type: event.event_type,
    schema_version: event.schema_version ?? 1,
    occurred_at: (event.occurred_at ?? new Date()).toISOString(),
    data: event.payload ?? {},
  });
  if (!parsed.success) throw new Error(`Invalid outbox event: ${parsed.error.message}`);
  validateJobPayload(parsed.data.event_type, parsed.data.data);
  return parsed.data;
}
