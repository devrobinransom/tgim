import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CastCivicPollVoteSchema,
  CreateCivicFormSchema,
  CreateCivicPollSchema,
  SubmitCivicFormSchema,
} from '@tgim/shared';
import { requireActor } from '../auth.js';
import { aggregateService, formService, pollService } from '../services/full-platform.service.js';
import { dbService } from '../services/db.service.js';
import { createJobPublisher } from '../services/job-publisher.js';
import { getOpenProjectMapping } from '../services/openproject-sync.service.js';

function error(reply: FastifyReply, request: FastifyRequest, status: number, code: string, message: string, details?: unknown) {
  return reply.status(status).send({ error: { code, message, request_id: request.id, ...(details ? { details } : {}) } });
}

export async function registerFullPlatformRoutes(app: FastifyInstance) {
  app.post('/api/v1/forms', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_admin']);
    if (!actor) return;
    const parsed = CreateCivicFormSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, request, 400, 'validation_failed', 'Form definition is invalid', parsed.error.flatten());
    try {
      const item = await formService.create(parsed.data, actor.id);
      await dbService.audit.log({ actor_id: actor.id, event_type: 'form.create', target_table: 'forms', target_id: item.id, payload: { slug: item.slug, version: item.active_version } });
      return reply.status(201).send(item);
    } catch (cause) {
      return error(reply, request, 409, 'form_create_failed', cause instanceof Error ? cause.message : 'Unable to create form');
    }
  });

  app.post('/api/v1/forms/:slug/publish', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_admin']);
    if (!actor) return;
    const { slug } = request.params as { slug: string };
    const item = await formService.publish(slug);
    if (!item) return error(reply, request, 404, 'form_not_found', 'Draft form not found');
    await dbService.audit.log({ actor_id: actor.id, event_type: 'form.publish', target_table: 'forms', target_id: item.id, payload: { version: item.active_version } });
    return item;
  });

  app.get('/api/v1/forms/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const item = await formService.findPublished(slug);
    if (!item) return error(reply, request, 404, 'form_not_found', 'Published form not found');
    return item;
  });

  app.post('/api/v1/forms/:slug/responses', async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const parsed = SubmitCivicFormSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, request, 400, 'validation_failed', 'Form response is invalid', parsed.error.flatten());
    const { slug } = request.params as { slug: string };
    try {
      const session = await formService.submit(slug, actor.id, parsed.data);
      await dbService.audit.log({ actor_id: actor.id, event_type: 'form.response_submit', target_table: 'form_response_sessions', target_id: session.id, payload: { form_slug: slug, area_id: parsed.data.area_id } });
      return reply.status(201).send(session);
    } catch (cause) {
      return error(reply, request, 422, 'form_response_rejected', cause instanceof Error ? cause.message : 'Form response rejected');
    }
  });

  app.get('/api/v1/forms/:slug/responses', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
    if (!actor) return;
    return formService.listResponses((request.params as { slug: string }).slug);
  });

  app.post('/api/v1/polls', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_admin']);
    if (!actor) return;
    const parsed = CreateCivicPollSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, request, 400, 'validation_failed', 'Poll definition is invalid', parsed.error.flatten());
    const poll = await pollService.create(parsed.data, actor.id);
    await dbService.audit.log({ actor_id: actor.id, event_type: 'poll.create', target_table: 'polls', target_id: poll.id, payload: { area_id: poll.area_id, type: poll.type } });
    return reply.status(201).send(poll);
  });

  app.post('/api/v1/polls/:id/publish', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_admin']);
    if (!actor) return;
    const poll = await pollService.publish((request.params as { id: string }).id);
    if (!poll) return error(reply, request, 404, 'poll_not_found', 'Poll not found');
    await dbService.audit.log({ actor_id: actor.id, event_type: 'poll.publish', target_table: 'polls', target_id: poll.id, payload: { area_id: poll.area_id } });
    return poll;
  });

  app.get('/api/v1/polls', async request => pollService.listActive((request.query as { areaId?: string }).areaId));

  app.post('/api/v1/polls/:id/votes', async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const parsed = CastCivicPollVoteSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, request, 400, 'validation_failed', 'Vote is invalid', parsed.error.flatten());
    const pollId = (request.params as { id: string }).id;
    try {
      const vote = await pollService.vote(pollId, actor, parsed.data);
      await dbService.audit.log({ actor_id: actor.id, event_type: 'poll.vote', target_table: 'polls', target_id: pollId, payload: { receipt_id: vote.id } });
      return reply.status(201).send({ receipt_id: vote.id, poll_id: pollId, accepted_at: vote.created_at });
    } catch (cause) {
      return error(reply, request, 409, 'vote_rejected', cause instanceof Error ? cause.message : 'Vote rejected');
    }
  });

  app.get('/api/v1/polls/:id/results', async (request, reply) => {
    const results = await pollService.results((request.params as { id: string }).id);
    return results ?? error(reply, request, 404, 'poll_not_found', 'Poll not found');
  });

  app.get('/api/v1/aggregates/pincodes/:code', async (request, reply) => {
    const code = (request.params as { code: string }).code;
    if (!/^\d{6}$/.test(code)) return error(reply, request, 400, 'invalid_pincode', 'A six-digit pincode is required');
    const aggregate = await aggregateService.pincode(code);
    return aggregate ?? error(reply, request, 404, 'pincode_not_found', 'No aggregate is available for this pincode');
  });

  app.post('/api/v1/operations/materialized-views/refresh', async (request, reply) => {
    const actor = await requireActor(request, reply, ['platform_admin']);
    if (!actor) return;
    const result = await aggregateService.refresh();
    await dbService.audit.log({ actor_id: actor.id, event_type: 'aggregates.refresh', target_table: 'materialized_views', target_id: 'public-bi', payload: result });
    return result;
  });

  app.get('/api/v1/openproject/promises/:id', async (request, reply) => {
    const actor = await requireActor(request, reply, ['party_lead', 'department_officer', 'platform_admin']);
    if (!actor) return;
    const item = await getOpenProjectMapping((request.params as { id: string }).id);
    return item ?? error(reply, request, 404, 'openproject_mapping_not_found', 'Promise has not been synchronized');
  });

  app.post('/api/v1/openproject/promises/:id/retry', async (request, reply) => {
    const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
    if (!actor) return;
    const promiseId = (request.params as { id: string }).id;
    const promise = await dbService.partyPromises.findUnique(promiseId);
    if (!promise) return error(reply, request, 404, 'promise_not_found', 'Promise not found');
    const eventId = await createJobPublisher().publish({ event_id: crypto.randomUUID(), event_type: 'openproject.sync', entity_type: 'party_promise', entity_id: promiseId, payload: { party_promise_id: promiseId }, schema_version: 1, occurred_at: new Date() });
    await dbService.audit.log({ actor_id: actor.id, event_type: 'openproject.sync_queued', target_table: 'outbox_events', target_id: eventId, payload: { party_promise_id: promiseId } });
    return reply.status(202).send({ id: eventId, status: 'queued' });
  });
}
