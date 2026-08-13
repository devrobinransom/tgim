import fastify from 'fastify';
import cors from '@fastify/cors';
import { createHash, randomBytes } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { dbService } from './services/db.service.js';
import { isSovereignMode } from '@tgim/shared';
import { CreateIssueSchema, SubmitVerificationSchema, AdoptPromiseSchema, AddDeliveryUpdateSchema, ApplyVolunteerSchema, ReviewVolunteerSchema, PublishManifestoSchema, CreateDisputeSchema, ResolveDisputeSchema, NotificationPreferenceSchema, ModerationActionSchema, UploadEvidenceSchema, AssignPartyMemberSchema, AssignVerificationSchema, UpdateVerificationAssignmentSchema, UpdatePartyPromiseSchema, PaginationSchema, CreateAuthoritySchema, LinkExternalCaseSchema, UpdateExternalCaseSchema, Open311CreateRequestSchema, SubmitToAuthoritySchema, CreateExternalCaseAppealSchema, AddExternalCaseDocumentSchema, CreatePromiseMilestoneSchema, UpdatePromiseMilestoneSchema, CitizenPromiseVerdictSchema, PincodeGeocodeSchema, CreateOrganizationSchema, CreateOrganizationInvitationSchema, AcceptOrganizationInvitationSchema, GrantIssueSharingConsentSchema, CreateScopeGrantSchema } from '@tgim/shared';
import { calculatePriorityScore } from '@tgim/shared';
import { requireActor } from './auth.js';
import { generateManifestoPromises } from './services/manifesto-generator.service.js';
import { readLocalEvidence, storeEvidence } from './services/evidence-storage.service.js';
import { renderManifestoPdf } from './services/pdf-export.service.js';
import { synthesizeSpeech, transcribeAudio } from './services/sarvam-ai.service.js';
import { authenticateMcpBearer } from './mcp-auth.js';
import { createMcpServer } from './mcp-server.js';
import { isPublicVisibility, toPublicDisputeOutcome, toPublicExternalCase, toPublicIssue, toPublicManifesto, toPublicVerification } from './public-projection.js';
import { createJobPublisher } from './services/job-publisher.js';
import { closeRateLimiter, consumeRateLimit } from './services/rate-limit.service.js';
import { closeBullMqProducer, getSovereignQueue, valkeyUrl } from './services/bullmq.service.js';
import { registerFullPlatformRoutes } from './routes/full-platform.routes.js';
export function buildApp() {
    const app = fastify({ logger: true, trustProxy: process.env.TRUST_PROXY === 'true' });
    void app.register(registerFullPlatformRoutes);
    app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
        done(null, Object.fromEntries(new URLSearchParams(body)));
    });
    const requestCounts = new Map();
    const metrics = { requests: 0, errors: 0, startedAt: Date.now() };
    // Register CORS
    app.register(cors, {
        // Never silently permit browser origins in production. Native and server
        // clients have no Origin header and continue to authenticate normally.
        origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean) : process.env.NODE_ENV === 'production' ? false : true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    app.addHook('onRequest', async (request, reply) => {
        metrics.requests += 1;
        reply.header('x-request-id', String(request.headers['x-request-id'] || crypto.randomUUID()));
        reply.header('x-content-type-options', 'nosniff');
        reply.header('referrer-policy', 'no-referrer');
        const now = Date.now();
        const limit = Number(process.env.RATE_LIMIT_MAX || 120);
        const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
        const distributed = process.env.RATE_LIMIT_BACKEND === 'valkey' || process.env.RATE_LIMIT_BACKEND === 'distributed';
        let bucket;
        if (distributed) {
            try {
                bucket = await consumeRateLimit(request.ip, limit, windowMs);
            }
            catch {
                if (process.env.NODE_ENV === 'production') {
                    return reply.status(503).send({ error: { code: 'rate_limiter_unavailable', message: 'Request protection is unavailable' } });
                }
                const current = requestCounts.get(request.ip);
                bucket = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { ...current, count: current.count + 1 };
                requestCounts.set(request.ip, { count: bucket.count, resetAt: bucket.resetAt });
            }
        }
        else {
            const current = requestCounts.get(request.ip);
            bucket = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { ...current, count: current.count + 1 };
            requestCounts.set(request.ip, { count: bucket.count, resetAt: bucket.resetAt });
        }
        reply.header('x-ratelimit-limit', String(limit));
        reply.header('x-ratelimit-remaining', String(bucket.remaining ?? Math.max(0, limit - bucket.count)));
        reply.header('x-ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > limit)
            return reply.status(429).send({ error: { code: 'rate_limited', message: 'Too many requests' } });
    });
    app.addHook('onResponse', async (_request, reply) => {
        if (reply.statusCode >= 500)
            metrics.errors += 1;
    });
    app.addHook('onClose', async () => {
        await Promise.all([closeRateLimiter(), closeBullMqProducer()]);
        const prisma = dbService.getPrisma();
        if (prisma)
            await prisma.$disconnect();
    });
    const isPublicIssue = isPublicVisibility;
    const publicIssue = toPublicIssue;
    const jobPublisher = createJobPublisher();
    const publishJob = async (eventType, entityType, entityId, payload) => jobPublisher.publish({ event_id: crypto.randomUUID(), event_type: eventType, entity_type: entityType, entity_id: entityId, payload, schema_version: 1, occurred_at: new Date() });
    const invitationHash = (token) => createHash('sha256').update(token).digest('hex');
    const requireOrganizationAdmin = async (organizationId, actorId, isPlatformAdmin) => {
        if (isPlatformAdmin)
            return true;
        const membership = await dbService.organizations.findMembership(organizationId, actorId);
        return membership?.role === 'owner' || membership?.role === 'admin';
    };
    const requireScope = async (actor, reply, scopeType, scopeId, capability) => {
        if (actor.role === 'platform_admin')
            return { id: 'platform-admin' };
        const grant = await dbService.scopeGrants.findActive(actor.id, scopeType, scopeId, capability);
        if (!grant) {
            reply.status(403).send({ error: { code: 'scope_forbidden', message: `Missing active ${capability} grant for this ${scopeType}` } });
            return null;
        }
        return grant;
    };
    const promiseAccountability = async (promiseId) => {
        const promise = await dbService.partyPromises.findUnique(promiseId);
        if (!promise)
            return null;
        const [milestones, delivery_updates, verdicts, sourcePromise] = await Promise.all([dbService.promiseMilestones.findByPromise(promiseId), dbService.deliveryUpdates.findByPromise(promiseId), dbService.promiseVerdicts.findByPromise(promiseId), dbService.manifestoPromises.findUnique(promise.source_promise_id)]);
        const sourceClusterIds = sourcePromise?.cluster_id ? [sourcePromise.cluster_id] : [];
        const issues = (await dbService.issues.findMany({})).filter(issue => issue.cluster_id && sourceClusterIds.includes(issue.cluster_id));
        const official_cases = (await Promise.all(issues.map(issue => dbService.externalCases.findByIssue(issue.id)))).flat();
        const completed = milestones.filter(item => ['completed', 'verified'].includes(item.status)).length;
        const evidenced = milestones.filter(item => Boolean(item.evidence_url)).length;
        const onTime = milestones.filter(item => !item.due_at || (item.completed_at ? new Date(item.completed_at) <= new Date(item.due_at) : new Date() <= new Date(item.due_at))).length;
        const verdict_counts = { delivered: 0, partly_delivered: 0, not_delivered: 0, not_sure: 0 };
        verdicts.forEach(item => { verdict_counts[item.verdict] += 1; });
        const milestone_progress = milestones.length ? Math.round(completed / milestones.length * 100) : 0;
        const evidence_strength = milestones.length ? Math.round(evidenced / milestones.length * 100) : 0;
        const timeliness = milestones.length ? Math.round(onTime / milestones.length * 100) : 0;
        const decisive = verdicts.length - verdict_counts.not_sure;
        const citizen_confidence = decisive ? Math.round((verdict_counts.delivered + verdict_counts.partly_delivered * 0.5) / decisive * 100) : 50;
        const score = Math.round(milestone_progress * 0.4 + evidence_strength * 0.25 + timeliness * 0.2 + citizen_confidence * 0.15);
        const label = score >= 90 && milestones.some(item => item.status === 'verified') ? 'delivered' : score >= 65 ? 'on_track' : score >= 35 ? 'partial' : milestones.length ? 'at_risk' : 'no_evidence';
        const disputes = await dbService.disputes.findPublicByPromise(promiseId);
        return { promise, milestones, delivery_updates, source_cluster_ids: sourceClusterIds, official_cases: official_cases.map(toPublicExternalCase), public_disputes: disputes.map(toPublicDisputeOutcome).filter((item) => item !== null), outcome: { score, label, milestone_progress, evidence_strength, timeliness, citizen_confidence, verdict_counts, calculated_at: new Date() } };
    };
    // Streamable HTTP MCP endpoint. It is deliberately stateless: every request
    // verifies a short-lived OAuth client-credentials bearer token, and no MCP
    // session or user data is kept in process memory.
    app.route({
        method: ['GET', 'POST', 'DELETE'],
        url: '/mcp',
        handler: async (request, reply) => {
            try {
                const principal = await authenticateMcpBearer(request.headers.authorization);
                const server = createMcpServer(principal);
                const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
                await server.connect(transport);
                reply.hijack();
                try {
                    await transport.handleRequest(request.raw, reply.raw, request.body);
                }
                finally {
                    await server.close();
                }
                return reply;
            }
            catch (error) {
                return reply.status(401).send({ error: { code: 'mcp_unauthorized', message: error instanceof Error ? error.message : 'MCP authentication failed' } });
            }
        },
    });
    // Health check
    app.get('/health', async () => {
        return { status: 'ok', database: dbService.isPrismaEnabled() ? 'prisma' : 'in-memory-fallback' };
    });
    app.get('/ready', async (_request, reply) => {
        try {
            const prisma = dbService.getPrisma();
            if (process.env.NODE_ENV === 'production' && !prisma)
                return reply.status(503).send({ status: 'not_ready', reason: 'database_not_configured' });
            if (process.env.NODE_ENV === 'production' && !isSovereignMode())
                return reply.status(503).send({ status: 'not_ready', reason: 'sovereignty_mode_required' });
            if (prisma)
                await prisma.$queryRaw `SELECT 1`;
            if (process.env.NODE_ENV === 'production' && isSovereignMode()) {
                const required = {
                    oidc: Boolean(process.env.OIDC_ISSUER && process.env.OIDC_AUDIENCE && (process.env.OIDC_JWKS_URL || process.env.OIDC_ISSUER)),
                    valkey: Boolean(valkeyUrl()),
                    storage: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
                    cors: Boolean(process.env.CORS_ORIGINS),
                    distributed_rate_limit: ['valkey', 'distributed'].includes(process.env.RATE_LIMIT_BACKEND || ''),
                    demo_disabled: process.env.DEMO_AUTH_ENABLED !== 'true',
                };
                const missing = Object.entries(required).filter(([, ready]) => !ready).map(([name]) => name);
                if (missing.length)
                    return reply.status(503).send({ status: 'not_ready', reason: 'sovereign_dependencies_missing', missing });
                await getSovereignQueue().getJobCounts('wait', 'active', 'failed');
            }
            return { status: 'ready', database: dbService.isPrismaEnabled() ? 'prisma' : 'in-memory-fallback' };
        }
        catch {
            return reply.status(503).send({ status: 'not_ready' });
        }
    });
    app.get('/metrics', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        return { ...metrics, uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000) };
    });
    app.get('/api/v1/operations/status', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const configured = (values) => values.every(Boolean);
        const outbox = await dbService.outboxEvents.findMany();
        const pending = outbox.filter(event => event.status === 'pending' || event.status === 'dispatched');
        const failed = outbox.filter(event => event.status === 'failed');
        return {
            deployment_mode: isSovereignMode() ? 'sovereign' : 'managed',
            database: dbService.isPrismaEnabled() ? 'configured' : 'fallback_not_release_ready',
            providers: {
                oidc: configured([process.env.OIDC_ISSUER, process.env.OIDC_AUDIENCE]) ? 'configured_unverified' : 'disabled',
                mcp_oauth: configured([process.env.MCP_TOKEN_ISSUER, process.env.MCP_TOKEN_AUDIENCE, process.env.MCP_JWKS_URL]) ? 'configured_unverified' : 'disabled',
                jobs: valkeyUrl() ? 'configured_unverified' : 'failed',
                object_storage: configured([process.env.S3_ENDPOINT, process.env.S3_BUCKET, process.env.S3_ACCESS_KEY_ID, process.env.S3_SECRET_ACCESS_KEY]) ? 'configured_unverified' : 'disabled',
                open311: process.env.OPEN311_API_KEY ? 'configured_unverified' : 'authority_configuration_required',
                notifications: process.env.SMTP_HOST && process.env.NOTIFICATION_FROM_EMAIL ? 'smtp_configured_unverified' : 'in_app_only',
                openproject: process.env.OPENPROJECT_URL && process.env.OPENPROJECT_API_KEY ? 'configured_unverified' : 'disabled',
                rate_limit: ['valkey', 'distributed'].includes(process.env.RATE_LIMIT_BACKEND || '') ? 'configured_unverified' : 'in_memory_not_release_ready',
            },
            outbox: { pending: pending.length, oldest_pending_at: pending[0]?.created_at ?? null, failed: failed.length, latest_failure_at: failed.at(-1)?.dispatched_at ?? null },
            runtime: { requests: metrics.requests, errors: metrics.errors, uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000) },
        };
    });
    app.get('/api/v1/jobs', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        return dbService.jobs.findMany();
    });
    app.get('/api/v1/operations/outbox', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        return (await dbService.outboxEvents.findMany()).map(({ id, event_id, event_type, entity_type, entity_id, status, created_at, dispatched_at }) => ({ id, event_id, event_type, entity_type, entity_id, status, created_at, dispatched_at }));
    });
    app.post('/api/v1/media/uploads', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'department_officer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = UploadEvidenceSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        try {
            const forwardedProto = String(request.headers['x-forwarded-proto'] || 'http').split(',')[0];
            const forwardedHost = String(request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000').split(',')[0];
            const result = await storeEvidence(parsed.data, `${forwardedProto}://${forwardedHost}`);
            await dbService.audit.log({ actor_id: actor.id, event_type: 'media.process', target_table: 'users', target_id: actor.id, payload: { media_hash: result.media_hash, bytes: result.bytes, media_type: result.media_type } });
            return reply.status(201).send(result);
        }
        catch (error) {
            return reply.status(400).send({ error: error instanceof Error ? error.message : 'Evidence processing failed' });
        }
    });
    app.get('/api/v1/media/:id.:extension', async (request, reply) => {
        const { id } = request.params;
        const object = readLocalEvidence(id);
        if (!object)
            return reply.status(404).send({ error: 'Evidence not found' });
        reply.header('cache-control', 'public, max-age=31536000, immutable');
        return reply.type(object.contentType).send(object.body);
    });
    // --- Sarvam AI proxy (voice-to-text and text-to-speech) ---
    // The subscription key lives only server-side; clients send base64 audio and
    // receive a transcript (Report voice entry) or base64 speech (read-aloud).
    app.post('/api/v1/ai/speech-to-text', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        const body = request.body;
        if (typeof body.audio_base64 !== 'string' || !body.audio_base64) {
            return reply.status(400).send({ error: 'audio_base64 is required' });
        }
        const bytes = Buffer.from(body.audio_base64, 'base64');
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const mimeType = typeof body.media_type === 'string' && body.media_type ? body.media_type : 'audio/m4a';
        const language = typeof body.language === 'string' ? body.language : 'en';
        if (!bytes.length || bytes.byteLength > 20_000_000) {
            return reply.status(400).send({ error: 'audio_base64 must decode to between 1 byte and 20 MB' });
        }
        try {
            const result = await transcribeAudio({ bytes: arrayBuffer, mimeType, language });
            await dbService.audit.log({
                actor_id: actor.id,
                event_type: 'ai.speech_to_text',
                target_table: 'users',
                target_id: actor.id,
                payload: { language_code: result.language_code ?? null, request_id: result.request_id ?? null },
            });
            return reply.send({ transcript: result.transcript, language_code: result.language_code ?? null });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Speech-to-text failed';
            if (message.includes('not configured')) {
                return reply.status(503).send({ error: { code: 'ai_not_configured', message } });
            }
            return reply.status(502).send({ error: { code: 'ai_provider_error', message } });
        }
    });
    app.post('/api/v1/ai/text-to-speech', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        const body = request.body;
        if (typeof body.text !== 'string' || body.text.length < 2 || body.text.length > 2500) {
            return reply.status(400).send({ error: 'text must be a string between 2 and 2500 characters' });
        }
        const language = typeof body.language === 'string' ? body.language : 'en';
        try {
            const { audioBase64, mimeType } = await synthesizeSpeech({ text: body.text, language });
            await dbService.audit.log({
                actor_id: actor.id,
                event_type: 'ai.text_to_speech',
                target_table: 'users',
                target_id: actor.id,
                payload: { characters: body.text.length, language },
            });
            return reply.send({ audio_base64: audioBase64, media_type: mimeType });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Speech synthesis failed';
            if (message.includes('not configured')) {
                return reply.status(503).send({ error: { code: 'ai_not_configured', message } });
            }
            return reply.status(502).send({ error: { code: 'ai_provider_error', message } });
        }
    });
    // --- Identity / Sandbox Role Switching ---
    app.get('/api/v1/auth/me', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        const [organizations, grants] = await Promise.all([
            dbService.organizations.findForUser(actor.id),
            dbService.scopeGrants.findForActor(actor.id),
        ]);
        return {
            user: actor,
            organizations,
            grants: grants.filter(grant => !grant.revoked_at && (!grant.ends_at || grant.ends_at > new Date())),
        };
    });
    app.post('/api/v1/auth/role', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const { userId, role } = request.body;
        try {
            const updated = await dbService.users.updateRole(userId, role);
            await dbService.audit.log({
                actor_id: actor.id,
                event_type: 'user.role_update',
                target_table: 'users',
                target_id: userId,
                payload: { new_role: role }
            });
            return updated;
        }
        catch (e) {
            return reply.status(404).send({ error: e.message });
        }
    });
    // --- Tenant organizations and scoped invitations ---
    app.post('/api/v1/organizations', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const parsed = CreateOrganizationSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const organization = await dbService.organizations.create(parsed.data);
        await dbService.organizations.addMembership({ organization_id: organization.id, user_id: actor.id, role: 'owner' });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'organization.create', target_table: 'organizations', target_id: organization.id, payload: { kind: organization.kind } });
        return reply.status(201).send(organization);
    });
    app.get('/api/v1/organizations/mine', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        return dbService.organizations.findForUser(actor.id);
    });
    app.post('/api/v1/organizations/:id/invitations', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        const { id } = request.params;
        const organization = await dbService.organizations.findUnique(id);
        if (!organization || !organization.active)
            return reply.status(404).send({ error: 'Active organization not found' });
        if (!(await requireOrganizationAdmin(id, actor.id, actor.role === 'platform_admin')))
            return reply.status(403).send({ error: 'Only an owner or admin of this organization can invite people' });
        const parsed = CreateOrganizationInvitationSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const token = randomBytes(32).toString('base64url');
        const invitation = await dbService.organizations.createInvitation({
            organization_id: id,
            invitee_email: parsed.data.invitee_email.trim().toLowerCase(),
            role: parsed.data.role,
            token_hash: invitationHash(token),
            invited_by: actor.id,
            expires_at: new Date(Date.now() + parsed.data.expires_in_hours * 60 * 60 * 1000),
        });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'organization.invite', target_table: 'organization_invitations', target_id: invitation.id, payload: { organization_id: id, role: invitation.role } });
        // Mail delivery is intentionally outside this endpoint. The raw token is
        // returned once so an approved tenant can deliver it through its chosen
        // authenticated channel; only its hash is stored.
        return reply.status(201).send({ id: invitation.id, organization_id: id, invitee_email: invitation.invitee_email, role: invitation.role, expires_at: invitation.expires_at, invitation_token: token });
    });
    app.post('/api/v1/organization-invitations/accept', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        const parsed = AcceptOrganizationInvitationSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const invitation = await dbService.organizations.findInvitationByTokenHash(invitationHash(parsed.data.token));
        if (!invitation || invitation.accepted_at || invitation.expires_at <= new Date())
            return reply.status(404).send({ error: 'Invitation is invalid, expired, or already accepted' });
        const isDevelopmentDemo = process.env.NODE_ENV !== 'production' && process.env.DEMO_AUTH_ENABLED !== 'false';
        if (!isDevelopmentDemo && actor.email?.trim().toLowerCase() !== invitation.invitee_email)
            return reply.status(403).send({ error: 'Sign in with the email address that received this invitation' });
        const membership = await dbService.organizations.addMembership({ organization_id: invitation.organization_id, user_id: actor.id, role: invitation.role });
        await dbService.organizations.acceptInvitation(invitation.id);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'organization.invitation_accept', target_table: 'organization_memberships', target_id: membership.id, payload: { organization_id: invitation.organization_id, role: membership.role } });
        return reply.status(201).send(membership);
    });
    app.post('/api/v1/scope-grants', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const parsed = CreateScopeGrantSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const startsAt = parsed.data.starts_at ? new Date(parsed.data.starts_at) : new Date();
        const endsAt = parsed.data.ends_at ? new Date(parsed.data.ends_at) : undefined;
        if (endsAt && endsAt <= startsAt)
            return reply.status(400).send({ error: { code: 'invalid_grant_window', message: 'ends_at must be after starts_at' } });
        const grant = await dbService.scopeGrants.create({ actor_id: parsed.data.actor_id, scope_type: parsed.data.scope_type, scope_id: parsed.data.scope_id, capabilities: parsed.data.capabilities, issued_by: actor.id, starts_at: startsAt, ends_at: endsAt });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'scope_grant.create', target_table: 'actor_scope_grants', target_id: grant.id, payload: { actor_id: grant.actor_id, scope_type: grant.scope_type, scope_id: grant.scope_id, capabilities: grant.capabilities } });
        return reply.status(201).send(grant);
    });
    app.get('/api/v1/scope-grants/mine', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        return dbService.scopeGrants.findForActor(actor.id);
    });
    app.post('/api/v1/scope-grants/:id/revoke', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const grant = await dbService.scopeGrants.revoke(request.params.id);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'scope_grant.revoke', target_table: 'actor_scope_grants', target_id: grant.id, payload: { actor_id: grant.actor_id, scope_type: grant.scope_type, scope_id: grant.scope_id } });
        return grant;
    });
    // --- Geography & Area Search ---
    app.get('/api/v1/areas', async () => {
        return dbService.areas.findMany();
    });
    app.get('/api/v1/areas/search', async (request, reply) => {
        const { q } = request.query;
        if (!q)
            return reply.status(400).send({ error: 'Query parameter "q" is required' });
        return dbService.areas.search(q);
    });
    // --- Pincode Listing & Geocoding ---
    app.get('/api/v1/pincodes', async () => {
        return (await dbService.pincodes.findMany()).map(p => ({
            pincode_code: p.pincode_code,
            name: p.name,
            area_id: p.area_id,
            centroid: { latitude: p.centroid_latitude, longitude: p.centroid_longitude },
        }));
    });
    app.post('/api/v1/geocode/pincode', async (request, reply) => {
        const parsed = PincodeGeocodeSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { latitude, longitude } = parsed.data;
        const pincode = await dbService.pincodes.resolveByCoordinates(latitude, longitude);
        if (!pincode)
            return reply.status(404).send({ error: 'No pincode boundary contains the given coordinates' });
        await dbService.audit.log({
            actor_id: request.headers['x-tgim-demo-role'] ? 'anonymous' : undefined,
            event_type: 'geocode.pincode',
            target_table: 'pincode_boundaries',
            target_id: pincode.id,
            payload: { latitude, longitude, pincode_code: pincode.pincode_code },
        });
        return { pincode_code: pincode.pincode_code, name: pincode.name, area_id: pincode.area_id };
    });
    app.get('/api/v1/authorities', async (request) => {
        const { areaId, category } = request.query;
        return dbService.authorities.findMany({ area_id: areaId, category, active: true });
    });
    app.get('/api/v1/authorities/route', async (request, reply) => {
        const { areaId, category, latitude, longitude } = request.query;
        if (!category)
            return reply.status(400).send({ error: 'category is required' });
        return dbService.authorities.route(areaId, category, latitude === undefined ? undefined : Number(latitude), longitude === undefined ? undefined : Number(longitude));
    });
    app.post('/api/v1/authorities', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const parsed = CreateAuthoritySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const authority = await dbService.authorities.create(parsed.data);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'authority.create', target_table: 'civic_authorities', target_id: authority.id, payload: { service_code: authority.service_code, category: authority.category } });
        return reply.status(201).send(authority);
    });
    app.get('/open311/v2/services.json', async () => (await dbService.authorities.findMany({ active: true })).map(authority => ({
        service_code: authority.service_code, service_name: authority.service_name, description: authority.description || '', metadata: false, type: 'realtime', keywords: authority.category, group: authority.name,
    })));
    app.post('/open311/v2/requests.json', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        const parsed = Open311CreateRequestSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send([{ code: 400, description: parsed.error.issues.map(issue => issue.message).join('; ') }]);
        const authorities = await dbService.authorities.findMany({ active: true });
        const authority = authorities.find(item => item.service_code === parsed.data.service_code);
        if (!authority)
            return reply.status(404).send([{ code: 404, description: 'Unknown service_code' }]);
        const issue = await dbService.issues.create({ reporter_id: actor.id, category: authority.category, description: parsed.data.description, severity: 'medium', privacy: 'blurred', latitude: parsed.data.lat, longitude: parsed.data.long, idempotency_key: parsed.data.attribute?.idempotency_key || `open311-${actor.id}-${crypto.randomUUID()}` });
        const cluster = await dbService.clusters.create({ area_id: issue.area_id || authority.jurisdiction_area_id || 'ward-12-id', category: issue.category, title: authority.service_name, summary: issue.description });
        await dbService.issues.linkToCluster(issue.id, cluster.id);
        const officialCase = await dbService.externalCases.create({ issue_id: issue.id, cluster_id: cluster.id, authority_id: authority.id, provider: 'tgim-open311', external_id: issue.id, service_code: authority.service_code, status: 'new', status_notes: 'Accepted through the TGIM Open311 endpoint.', submitted_at: new Date() });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'open311.request_create', target_table: 'issues', target_id: issue.id, payload: { authority_id: authority.id, external_case_id: officialCase.id, service_code: authority.service_code } });
        return reply.status(201).send([{ service_request_id: issue.id, service_notice: 'TGIM preserves independent verification separately from official case status.', account_id: officialCase.id }]);
    });
    app.get('/open311/v2/requests/:id.json', async (request, reply) => {
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue)
            return reply.status(404).send([{ code: 404, description: 'Service request not found' }]);
        const cases = await dbService.externalCases.findByIssue(id);
        const latest = cases[0];
        return [{ service_request_id: issue.id, status: latest?.status === 'closed' ? 'closed' : 'open', status_notes: latest?.status_notes || '', service_code: latest?.service_code || issue.category, description: issue.description, requested_datetime: issue.created_at, updated_datetime: latest?.updated_at || issue.updated_at, lat: issue.public_latitude, long: issue.public_longitude }];
    });
    // --- Citizen Issue Reporting ---
    app.post('/api/v1/issues', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        // Validate request body
        const parseResult = CreateIssueSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { category, description, severity, privacy, latitude, longitude, media, idempotency_key } = parseResult.data;
        const reporterId = actor.id;
        try {
            const issue = await dbService.issues.create({
                reporter_id: reporterId,
                category,
                description,
                severity,
                privacy,
                latitude,
                longitude,
                idempotency_key,
            });
            // Handle media attachments
            if (media && media.length > 0) {
                for (const item of media) {
                    await dbService.media.create({
                        issue_id: issue.id,
                        media_url: item.media_url,
                        media_type: item.media_type,
                        media_hash: item.media_hash,
                        is_processed: true
                    });
                }
            }
            // --- In-Memory Spatial Clustering Worker Simulation ---
            // Search for clusters of the same category within approx. 200m (lat/lng diff <= 0.002)
            const existingClusters = await dbService.clusters.findMany({ category });
            let matchedCluster = existingClusters.find(c => {
                // If in-memory: find issues of cluster and check distance
                // Simplified mock: check if there is a cluster for the same area
                return c.area_id === issue.area_id;
            });
            if (!matchedCluster) {
                // Create new cluster
                matchedCluster = await dbService.clusters.create({
                    area_id: issue.area_id || 'ward-12-id',
                    category,
                    title: `Reported ${category} issue in ${category} cluster`,
                    summary: description.substr(0, 150) + '...',
                });
            }
            // Link issue to cluster
            await dbService.issues.linkToCluster(issue.id, matchedCluster.id);
            // Re-calculate cluster priority score
            const supportsCount = await dbService.supports.countByCluster(matchedCluster.id);
            const reports = await dbService.issues.findMany({ area_id: matchedCluster.area_id, category });
            const clusterIssues = reports.filter(r => r.cluster_id === matchedCluster.id);
            const score = calculatePriorityScore({
                supportsCount,
                reportsCount: clusterIssues.length,
                averageSeverity: severity,
                isVerified: matchedCluster.status === 'verified',
            });
            await dbService.clusters.updateScore(matchedCluster.id, score);
            await publishJob('cluster.score', 'cluster', matchedCluster.id, { cluster_id: matchedCluster.id });
            // Log audit trail
            await dbService.audit.log({
                actor_id: reporterId,
                event_type: 'issue.create',
                target_table: 'issues',
                target_id: issue.id,
                payload: { cluster_id: matchedCluster.id, score }
            });
            return reply.status(201).send(issue);
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    app.get('/api/v1/issues', async (request) => {
        const { areaId, category } = request.query;
        return (await dbService.issues.findMany({ area_id: areaId, category })).filter(isPublicIssue).map(publicIssue);
    });
    app.get('/api/v1/issues/page', async (request, reply) => {
        const query = request.query;
        const pagination = PaginationSchema.safeParse(query);
        if (!pagination.success)
            return reply.status(400).send({ error: pagination.error.flatten() });
        let issues = (await dbService.issues.findMany({ area_id: query.areaId, category: query.category })).filter(isPublicIssue);
        if (query.status)
            issues = issues.filter(issue => issue.status === query.status);
        if (query.search) {
            const term = query.search.toLowerCase();
            issues = issues.filter(issue => issue.description.toLowerCase().includes(term));
        }
        const { page, page_size } = pagination.data;
        return { items: issues.slice((page - 1) * page_size, page * page_size).map(publicIssue), page, page_size, total: issues.length, last_updated: new Date() };
    });
    app.get('/api/v1/issues/:id', async (request, reply) => {
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue || !isPublicIssue(issue))
            return reply.status(404).send({ error: 'Issue not found' });
        const media = await dbService.media.findByIssue(id);
        const supports = await dbService.supports.countByIssue(id);
        const official_cases = await dbService.externalCases.findByIssue(id);
        return { ...publicIssue(issue), media: media.filter(item => item.is_processed), supports, official_cases: official_cases.map(toPublicExternalCase) };
    });
    app.get('/api/v1/public/clusters/:id', async (request, reply) => {
        const { id } = request.params;
        const cluster = await dbService.clusters.findUnique(id);
        if (!cluster || !isPublicVisibility(cluster))
            return reply.status(404).send({ error: 'Issue cluster not found' });
        const issues = (await dbService.issues.findMany({ area_id: cluster.area_id })).filter(issue => issue.cluster_id === id && isPublicIssue(issue));
        const verifications = await dbService.verifications.findByCluster(id);
        const severity_mix = issues.reduce((counts, issue) => {
            counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
            return counts;
        }, {});
        return {
            cluster,
            issues: issues.map(publicIssue),
            report_count: issues.length,
            support_count: await dbService.supports.countByCluster(id),
            severity_mix,
            verifications: verifications.map(toPublicVerification),
            last_updated: cluster.updated_at,
        };
    });
    app.get('/api/v1/issues/:id/accountability', async (request, reply) => {
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue || !isPublicIssue(issue))
            return reply.status(404).send({ error: 'Issue not found' });
        const official_cases = await dbService.externalCases.findByIssue(id);
        const official_status_summary = Object.fromEntries(['new', 'open', 'acknowledged', 'in_progress', 'closed', 'rejected', 'appealed'].map(status => [status, official_cases.filter(item => item.status === status).length]));
        return { issue: publicIssue(issue), official_cases: official_cases.map(toPublicExternalCase), independent_status: issue.status, official_status_summary };
    });
    app.post('/api/v1/issues/:id/external-cases', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue)
            return reply.status(404).send({ error: 'Issue not found' });
        const parsed = LinkExternalCaseSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const authority = await dbService.authorities.findUnique(parsed.data.authority_id);
        if (!authority)
            return reply.status(404).send({ error: 'Authority not found' });
        const grant = await requireScope(actor, reply, 'authority', authority.id, 'external_case.link');
        if (!grant)
            return;
        const item = await dbService.externalCases.create({ issue_id: issue.id, cluster_id: issue.cluster_id, authority_id: authority.id, provider: parsed.data.provider, external_id: parsed.data.external_id, service_code: parsed.data.service_code, status: parsed.data.status, status_notes: parsed.data.status_notes, public_url: parsed.data.public_url, submitted_at: parsed.data.submitted_at ? new Date(parsed.data.submitted_at) : new Date() });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'external_case.link', target_table: 'issues', target_id: issue.id, payload: { external_case_id: item.id, authority_id: authority.id, provider: item.provider, external_id: item.external_id, grant_id: grant.id } });
        return reply.status(201).send(item);
    });
    app.patch('/api/v1/external-cases/:id', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.externalCases.findUnique(id)))
            return reply.status(404).send({ error: 'External case not found' });
        const parsed = UpdateExternalCaseSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const item = await dbService.externalCases.update(id, { ...parsed.data, closed_at: parsed.data.closed_at ? new Date(parsed.data.closed_at) : undefined, last_synced_at: new Date() });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'external_case.status_update', target_table: 'external_grievance_cases', target_id: item.id, payload: { status: item.status, issue_id: item.issue_id } });
        return item;
    });
    // Consent is specific to the recipient authority and purpose. It never makes
    // a report's precise location or evidence generally visible to a tenant.
    app.post('/api/v1/issues/:id/sharing-consents', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer']);
        if (!actor)
            return;
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue)
            return reply.status(404).send({ error: 'Issue not found' });
        if (issue.reporter_id !== actor.id)
            return reply.status(403).send({ error: 'Only the report author can grant recipient sharing consent' });
        const parsed = GrantIssueSharingConsentSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const authority = await dbService.authorities.findUnique(parsed.data.authority_id);
        if (!authority)
            return reply.status(404).send({ error: 'Authority not found' });
        const consent = await dbService.reportSharingConsents.grant({ issue_id: id, authority_id: parsed.data.authority_id, granted_by: actor.id, purpose: parsed.data.purpose, expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at) : undefined });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'issue.sharing_consent_granted', target_table: 'issues', target_id: id, payload: { authority_id: parsed.data.authority_id, purpose: parsed.data.purpose, expires_at: consent.expires_at } });
        return reply.status(201).send({ id: consent.id, issue_id: consent.issue_id, authority_id: consent.authority_id, purpose: consent.purpose, expires_at: consent.expires_at, created_at: consent.created_at });
    });
    app.post('/api/v1/issues/:id/submit-to-authority', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.issues.findUnique(id)))
            return reply.status(404).send({ error: 'Issue not found' });
        const parsed = SubmitToAuthoritySchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const authority = await dbService.authorities.findUnique(parsed.data.authority_id);
        if (!authority)
            return reply.status(404).send({ error: 'Authority not found' });
        const grant = await requireScope(actor, reply, 'authority', authority.id, 'external_case.submit');
        if (!grant)
            return;
        if (!(await dbService.reportSharingConsents.findActive(id, parsed.data.authority_id)))
            return reply.status(409).send({ error: 'The report author has not granted active consent to share this report with this authority' });
        const eventId = await publishJob('external_case.submit', 'issue', id, { issue_id: id, authority_id: parsed.data.authority_id, actor_id: actor.id });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'external_case.submission_queued', target_table: 'issues', target_id: id, payload: { authority_id: parsed.data.authority_id, outbox_event_id: eventId, grant_id: grant.id } });
        return reply.status(202).send({ id: eventId, status: 'queued' });
    });
    app.post('/api/v1/external-cases/:id/documents', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.externalCases.findUnique(id)))
            return reply.status(404).send({ error: 'External case not found' });
        const parsed = AddExternalCaseDocumentSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const item = await dbService.externalCaseDocuments.create({ external_case_id: id, ...parsed.data });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'external_case.document_add', target_table: 'external_grievance_cases', target_id: id, payload: { document_id: item.id, is_public: item.is_public } });
        return reply.status(201).send(item);
    });
    app.get('/api/v1/external-cases/:id/documents', async (request) => dbService.externalCaseDocuments.findByCase(request.params.id, true));
    app.post('/api/v1/external-cases/:id/appeals', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.externalCases.findUnique(id)))
            return reply.status(404).send({ error: 'External case not found' });
        const parsed = CreateExternalCaseAppealSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const appeal = await dbService.externalCaseAppeals.create({ external_case_id: id, raised_by: actor.id, ...parsed.data });
        await dbService.externalCases.update(id, { status: 'appealed', status_notes: 'A citizen appeal is awaiting authority response.', last_synced_at: new Date() });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'external_case.appeal', target_table: 'external_grievance_cases', target_id: id, payload: { appeal_id: appeal.id } });
        return reply.status(201).send(appeal);
    });
    app.post('/api/v1/issues/:id/support', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        const userId = actor.id;
        try {
            const support = await dbService.supports.create(userId, id);
            // Update parent cluster score if clustered
            const issue = await dbService.issues.findUnique(id);
            if (issue && issue.cluster_id) {
                const cluster = await dbService.clusters.findUnique(issue.cluster_id);
                if (cluster) {
                    const supportsCount = await dbService.supports.countByCluster(cluster.id);
                    const reports = await dbService.issues.findMany({ area_id: cluster.area_id });
                    const clusterIssues = reports.filter(r => r.cluster_id === cluster.id);
                    const score = calculatePriorityScore({
                        supportsCount,
                        reportsCount: clusterIssues.length,
                        averageSeverity: issue.severity,
                        isVerified: cluster.status === 'verified',
                    });
                    await dbService.clusters.updateScore(cluster.id, score);
                    await publishJob('cluster.score', 'cluster', cluster.id, { cluster_id: cluster.id });
                }
            }
            await dbService.audit.log({
                actor_id: userId,
                event_type: 'issue.support',
                target_table: 'issues',
                target_id: id,
                payload: { support_id: support.id }
            });
            return { success: true, support };
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    // --- Volunteer Verification ---
    app.post('/api/v1/verification/assignments', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = AssignVerificationSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const assignment = await dbService.verificationAssignments.assign({ ...parsed.data, due_at: parsed.data.due_at ? new Date(parsed.data.due_at) : undefined });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'verification.assign', target_table: 'issue_clusters', target_id: parsed.data.cluster_id, payload: { volunteer_id: parsed.data.volunteer_id, assignment_id: assignment.id } });
        return reply.status(201).send(assignment);
    });
    app.get('/api/v1/verification/assignments', async (request, reply) => {
        const actor = await requireActor(request, reply, ['volunteer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        return dbService.verificationAssignments.findByVolunteer(actor.id);
    });
    app.post('/api/v1/verification/assignments/:id/status', async (request, reply) => {
        const actor = await requireActor(request, reply, ['volunteer']);
        if (!actor)
            return;
        const parsed = UpdateVerificationAssignmentSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { id } = request.params;
        const assignment = await dbService.verificationAssignments.updateStatus(id, actor.id, parsed.data.status);
        await dbService.audit.log({ actor_id: actor.id, event_type: `verification.assignment_${parsed.data.status}`, target_table: 'issue_clusters', target_id: assignment.cluster_id, payload: { assignment_id: id } });
        return assignment;
    });
    app.post('/api/v1/verification', async (request, reply) => {
        const actor = await requireActor(request, reply, ['volunteer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parseResult = SubmitVerificationSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { cluster_id, outcome, notes, checklist } = parseResult.data;
        const verifierId = actor.id;
        try {
            const verification = await dbService.verifications.create({
                cluster_id,
                verifier_id: verifierId,
                outcome,
                notes,
                checklist,
            });
            await dbService.audit.log({
                actor_id: verifierId,
                event_type: 'cluster.verify',
                target_table: 'issue_clusters',
                target_id: cluster_id,
                payload: { outcome, verification_id: verification.id }
            });
            const assignments = await dbService.verificationAssignments.findByVolunteer(actor.id);
            const assignment = assignments.find(item => item.cluster_id === cluster_id);
            if (assignment)
                await dbService.verificationAssignments.updateStatus(assignment.id, actor.id, 'completed');
            return { success: true, verification };
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    // --- Manifesto Curation & AI Mock Generation ---
    app.post('/api/v1/manifesto/generate', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
        if (!actor)
            return;
        const party = actor.role === 'party_lead' ? await dbService.partyMemberships.findPartyForUser(actor.id) : null;
        if (actor.role === 'party_lead' && !party)
            return reply.status(403).send({ error: 'A verified party membership is required' });
        const grant = party ? await requireScope(actor, reply, 'party', party.id, 'manifesto.generate') : { id: 'platform-admin' };
        if (!grant)
            return;
        const { areaId } = request.body;
        if (!areaId)
            return reply.status(400).send({ error: 'areaId is required' });
        try {
            // Create new draft manifesto
            const manifesto = await dbService.manifestos.createDraft(areaId);
            // Fetch verified issue clusters in this area
            const clusters = await dbService.clusters.findMany({ area_id: areaId });
            const verifiedClusters = clusters.filter(c => c.status === 'verified' || (process.env.TGIM_IN_MEMORY === 'true' && c.status === 'draft'));
            if (verifiedClusters.length === 0)
                return reply.status(409).send({ error: 'No verified clusters are ready for drafting' });
            const generated = await generateManifestoPromises(verifiedClusters);
            for (const promise of generated.promises) {
                await dbService.manifestoPromises.create({
                    manifesto_id: manifesto.id,
                    ...promise,
                });
            }
            const completedManifesto = await dbService.manifestos.setGenerationMetadata(manifesto.id, {
                generation_provider: generated.provider,
                generation_model: generated.model,
                source_cluster_ids: verifiedClusters.map(cluster => cluster.id),
            });
            await dbService.audit.log({
                actor_id: actor.id,
                event_type: 'manifesto.generate',
                target_table: 'manifestos',
                target_id: manifesto.id,
                payload: { promises_count: generated.promises.length, provider: generated.provider, model: generated.model, source_cluster_ids: verifiedClusters.map(cluster => cluster.id), grant_id: grant.id }
            });
            // A draft is private to the authorised curator, but returning its generated
            // promises lets that curator review/adopt them without ever exposing an
            // unpublished manifesto through the public read endpoints.
            return reply.status(201).send({
                ...completedManifesto,
                promises: await dbService.manifestoPromises.findByManifesto(manifesto.id),
            });
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    app.post('/api/v1/manifesto/generate/async', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
        if (!actor)
            return;
        const party = actor.role === 'party_lead' ? await dbService.partyMemberships.findPartyForUser(actor.id) : null;
        if (actor.role === 'party_lead' && !party)
            return reply.status(403).send({ error: 'A verified party membership is required' });
        const grant = party ? await requireScope(actor, reply, 'party', party.id, 'manifesto.generate') : { id: 'platform-admin' };
        if (!grant)
            return;
        const { areaId } = request.body;
        if (!areaId)
            return reply.status(400).send({ error: 'areaId is required' });
        const eventId = await publishJob('manifesto.generate', 'area', areaId, { area_id: areaId, actor_id: actor.id });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'manifesto.generate_queued', target_table: 'outbox_events', target_id: eventId, payload: { area_id: areaId, grant_id: grant.id } });
        return reply.status(202).send({ id: eventId, status: 'queued' });
    });
    app.get('/api/v1/manifesto/:areaId', async (request, reply) => {
        const { areaId } = request.params;
        const manifesto = await dbService.manifestos.findLatestPublished(areaId);
        if (!manifesto)
            return reply.status(404).send({ error: 'No published manifesto found for this area' });
        const promises = await dbService.manifestoPromises.findByManifesto(manifesto.id);
        return toPublicManifesto(manifesto, promises);
    });
    app.get('/api/v1/public/manifestos/:areaId', async (request, reply) => {
        const { areaId } = request.params;
        const manifesto = await dbService.manifestos.findLatestPublished(areaId);
        if (!manifesto)
            return reply.status(404).send({ error: 'No published manifesto for this area' });
        return toPublicManifesto(manifesto, await dbService.manifestoPromises.findByManifesto(manifesto.id));
    });
    // --- Party Studio ---
    app.get('/api/v1/party/profiles', async () => dbService.partyProfiles.findMany());
    app.post('/api/v1/party/profiles/:id/verify', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        const profile = await dbService.partyProfiles.verify(id);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'party.verify', target_table: 'party_profiles', target_id: id });
        return profile;
    });
    app.post('/api/v1/party/memberships', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const parsed = AssignPartyMemberSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const membership = await dbService.partyMemberships.assign(parsed.data);
        await dbService.users.updateRole(parsed.data.user_id, 'party_lead');
        await dbService.audit.log({ actor_id: actor.id, event_type: 'party.member_assign', target_table: 'party_profiles', target_id: parsed.data.party_id, payload: { user_id: parsed.data.user_id } });
        return reply.status(201).send(membership);
    });
    app.post('/api/v1/party/promises/adopt', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
        if (!actor)
            return;
        const parseResult = AdoptPromiseSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { source_promise_id, adopted_title, adopted_description, target_metric, timeline } = parseResult.data;
        const party = actor.role === 'party_lead' ? await dbService.partyMemberships.findPartyForUser(actor.id) : (await dbService.partyProfiles.findMany()).find(profile => profile.is_verified) ?? null;
        if (!party)
            return reply.status(403).send({ error: 'A verified party profile and approved membership are required' });
        const grant = await requireScope(actor, reply, 'party', party.id, 'promise.adopt');
        if (!grant)
            return;
        const partyId = party.id;
        try {
            const partyPromise = await dbService.partyPromises.adopt({
                party_id: partyId,
                source_promise_id,
                adopted_title,
                adopted_description,
                target_metric,
                timeline: new Date(timeline),
            });
            await dbService.audit.log({
                actor_id: actor.id,
                event_type: 'promise.adopt',
                target_table: 'party_promises',
                target_id: partyPromise.id,
                payload: { source_promise_id, grant_id: grant.id }
            });
            await publishJob('openproject.sync', 'party_promise', partyPromise.id, { party_promise_id: partyPromise.id });
            return reply.status(201).send(partyPromise);
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    app.get('/api/v1/party/promises', async (request) => {
        const { status } = request.query;
        return dbService.partyPromises.findMany({ status });
    });
    app.patch('/api/v1/party/promises/:id', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
        if (!actor)
            return;
        const parsed = UpdatePartyPromiseSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { id } = request.params;
        const existing = await dbService.partyPromises.findUnique(id);
        if (!existing)
            return reply.status(404).send({ error: 'Promise not found' });
        let grant = { id: 'platform-admin' };
        if (actor.role === 'party_lead') {
            const party = await dbService.partyMemberships.findPartyForUser(actor.id);
            if (!party || party.id !== existing.party_id)
                return reply.status(403).send({ error: 'Promise belongs to another party profile' });
            const activeGrant = await requireScope(actor, reply, 'party', party.id, 'promise.update');
            if (!activeGrant)
                return;
            grant = activeGrant;
        }
        const updated = await dbService.partyPromises.update(id, { ...parsed.data, timeline: parsed.data.timeline ? new Date(parsed.data.timeline) : undefined });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'promise.update', target_table: 'party_promises', target_id: id, payload: { ...parsed.data, grant_id: grant.id } });
        return updated;
    });
    app.post('/api/v1/party/promises/:id/milestones', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'department_officer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.partyPromises.findUnique(id)))
            return reply.status(404).send({ error: 'Promise not found' });
        const parsed = CreatePromiseMilestoneSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const item = await dbService.promiseMilestones.create({ party_promise_id: id, title: parsed.data.title, description: parsed.data.description, sequence: parsed.data.sequence, due_at: parsed.data.due_at ? new Date(parsed.data.due_at) : undefined });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'promise.milestone_create', target_table: 'party_promises', target_id: id, payload: { milestone_id: item.id, sequence: item.sequence } });
        return reply.status(201).send(item);
    });
    app.patch('/api/v1/promise-milestones/:id', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'volunteer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = UpdatePromiseMilestoneSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const milestoneId = request.params.id;
        const existing = await dbService.promiseMilestones.findUnique(milestoneId);
        if (!existing)
            return reply.status(404).send({ error: 'Milestone not found' });
        const isCitizenVerification = existing.title.toLowerCase().includes('citizen verified');
        if (isCitizenVerification && actor.role === 'department_officer')
            return reply.status(403).send({ error: 'Citizen verification must remain independent of the delivery owner' });
        if (isCitizenVerification && parsed.data.status !== 'verified')
            return reply.status(400).send({ error: 'The citizen verification milestone requires verified status' });
        try {
            const item = await dbService.promiseMilestones.update(milestoneId, { ...parsed.data, completed_at: parsed.data.completed_at ? new Date(parsed.data.completed_at) : undefined });
            await dbService.audit.log({ actor_id: actor.id, event_type: 'promise.milestone_update', target_table: 'party_promises', target_id: item.party_promise_id, payload: { milestone_id: item.id, status: item.status, evidence_url: item.evidence_url } });
            return item;
        }
        catch {
            return reply.status(404).send({ error: 'Milestone not found' });
        }
    });
    app.get('/api/v1/public/promises/:id/accountability', async (request, reply) => {
        const record = await promiseAccountability(request.params.id);
        return record || reply.status(404).send({ error: 'Promise not found' });
    });
    app.put('/api/v1/party/promises/:id/verdict', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_admin']);
        if (!actor)
            return;
        const { id } = request.params;
        if (!(await dbService.partyPromises.findUnique(id)))
            return reply.status(404).send({ error: 'Promise not found' });
        const parsed = CitizenPromiseVerdictSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const item = await dbService.promiseVerdicts.upsert(id, actor.id, parsed.data.verdict, parsed.data.evidence_url);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'promise.citizen_verdict', target_table: 'party_promises', target_id: id, payload: { verdict: item.verdict } });
        return item;
    });
    // --- Delivery Tracker ---
    app.post('/api/v1/tracker/updates', async (request, reply) => {
        const actor = await requireActor(request, reply, ['department_officer', 'platform_admin']);
        if (!actor)
            return;
        const parseResult = AddDeliveryUpdateSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { party_promise_id, status, update_text, evidence_url } = parseResult.data;
        const updaterId = actor.id;
        try {
            const update = await dbService.deliveryUpdates.create({
                party_promise_id,
                updater_id: updaterId,
                status,
                update_text,
                evidence_url,
            });
            // Update party promise status in db
            await dbService.partyPromises.updateStatus(party_promise_id, status);
            await dbService.audit.log({
                actor_id: updaterId,
                event_type: 'delivery.update',
                target_table: 'party_promises',
                target_id: party_promise_id,
                payload: { update_id: update.id, status }
            });
            const subscribers = await dbService.notificationPreferences.findPromiseSubscribers();
            for (const preference of subscribers) {
                const user = await dbService.users.findUnique(preference.user_id);
                await publishJob('notification.send', 'party_promise', party_promise_id, {
                    user_id: preference.user_id,
                    email: preference.channels.includes('email') ? user?.email : undefined,
                    title: `Promise update: ${status.replace('_', ' ')}`,
                    body: update_text,
                    data: { party_promise_id, update_id: update.id },
                });
            }
            return reply.status(201).send(update);
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    app.get('/api/v1/tracker/updates/:promiseId', async (request) => {
        const { promiseId } = request.params;
        return dbService.deliveryUpdates.findByPromise(promiseId);
    });
    // --- Volunteer access governance ---
    app.post('/api/v1/volunteers/applications', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'platform_admin']);
        if (!actor)
            return;
        const parsed = ApplyVolunteerSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const application = await dbService.volunteerApplications.create({ user_id: actor.id, ...parsed.data });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'volunteer.apply', target_table: 'volunteer_applications', target_id: application.id });
        return reply.status(201).send(application);
    });
    app.get('/api/v1/volunteers/applications', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        return dbService.volunteerApplications.findMany();
    });
    app.post('/api/v1/volunteers/applications/:id/review', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const parsed = ReviewVolunteerSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { id } = request.params;
        const application = await dbService.volunteerApplications.review(id, actor.id, parsed.data.status, parsed.data.review_notes);
        await dbService.audit.log({ actor_id: actor.id, event_type: `volunteer.${parsed.data.status}`, target_table: 'volunteer_applications', target_id: id, payload: { user_id: application.user_id } });
        return application;
    });
    // --- Human-approved manifesto publication ---
    app.post('/api/v1/manifesto/:id/publish', async (request, reply) => {
        const actor = await requireActor(request, reply, ['party_lead', 'platform_admin']);
        if (!actor)
            return;
        const parsed = PublishManifestoSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { id } = request.params;
        if (actor.role === 'party_lead') {
            const party = await dbService.partyMemberships.findPartyForUser(actor.id);
            if (!party)
                return reply.status(403).send({ error: 'A verified party membership is required' });
            const grant = await requireScope(actor, reply, 'party', party.id, 'manifesto.publish');
            if (!grant)
                return;
        }
        const manifesto = await dbService.manifestos.publish(id, actor.id);
        await dbService.audit.log({ actor_id: actor.id, event_type: 'manifesto.publish', target_table: 'manifestos', target_id: id, payload: { version: manifesto.version } });
        return manifesto;
    });
    // --- Citizen delivery disputes and moderator resolution ---
    app.post('/api/v1/disputes', async (request, reply) => {
        const actor = await requireActor(request, reply, ['citizen', 'volunteer', 'platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = CreateDisputeSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const dispute = await dbService.disputes.create({ ...parsed.data, raised_by: actor.id });
        await dbService.partyPromises.updateStatus(parsed.data.party_promise_id, 'disputed');
        await dbService.audit.log({ actor_id: actor.id, event_type: 'delivery.dispute', target_table: 'delivery_disputes', target_id: dispute.id, payload: { party_promise_id: parsed.data.party_promise_id } });
        return reply.status(201).send(dispute);
    });
    app.get('/api/v1/disputes', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const { promiseId } = request.query;
        return dbService.disputes.findMany(promiseId);
    });
    app.post('/api/v1/disputes/:id/resolve', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = ResolveDisputeSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        const { id } = request.params;
        const dispute = await dbService.disputes.resolve(id, actor.id, parsed.data.status, parsed.data.resolution_notes, { is_public: parsed.data.publish_outcome, public_rationale: parsed.data.public_rationale });
        await dbService.audit.log({ actor_id: actor.id, event_type: `delivery.dispute_${parsed.data.status}`, target_table: 'delivery_disputes', target_id: id, payload: { published: dispute.is_public } });
        return dispute;
    });
    // --- Notification preferences ---
    app.get('/api/v1/notifications/preferences', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        return (await dbService.notificationPreferences.get(actor.id)) ?? {
            user_id: actor.id, channels: ['in_app'], saved_area_ids: [], issue_updates: true,
            promise_updates: true, language: actor.preferred_language, updated_at: new Date(),
        };
    });
    app.put('/api/v1/notifications/preferences', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        const parsed = NotificationPreferenceSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        if (process.env.SOVEREIGNTY_MODE === 'sovereign' && parsed.data.channels.includes('push')) {
            return reply.status(400).send({ error: { code: 'push_disabled', message: 'Push delivery is disabled in sovereign mode. Use in-app or SMTP email.' } });
        }
        const preference = await dbService.notificationPreferences.upsert({ user_id: actor.id, ...parsed.data, updated_at: new Date() });
        await dbService.audit.log({ actor_id: actor.id, event_type: 'notification.preferences_update', target_table: 'users', target_id: actor.id });
        return preference;
    });
    app.get('/api/v1/notifications', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        return dbService.notifications.findByUser(actor.id);
    });
    app.post('/api/v1/notifications/:id/read', async (request, reply) => {
        const actor = await requireActor(request, reply);
        if (!actor)
            return;
        const { id } = request.params;
        return dbService.notifications.markRead(id, actor.id);
    });
    // --- Moderation and privacy-safe aggregates ---
    app.post('/api/v1/moderation/actions', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const parsed = ModerationActionSchema.safeParse(request.body);
        if (!parsed.success)
            return reply.status(400).send({ error: parsed.error.flatten() });
        if (parsed.data.target_table === 'issues') {
            const visibility = parsed.data.action === 'hide' ? 'hidden' : parsed.data.action === 'restore' ? 'public' : null;
            const status = parsed.data.action === 'mark_duplicate' ? 'duplicate' : null;
            if (visibility)
                await dbService.issues.updateVisibility(parsed.data.target_id, visibility);
            if (status)
                await dbService.issues.updateStatus(parsed.data.target_id, status);
        }
        const action = await dbService.moderation.create({ ...parsed.data, actor_id: actor.id });
        await dbService.audit.log({ actor_id: actor.id, event_type: `moderation.${parsed.data.action}`, target_table: parsed.data.target_table, target_id: parsed.data.target_id, payload: { reason: parsed.data.reason, moderation_action_id: action.id } });
        return reply.status(201).send(action);
    });
    app.get('/api/v1/moderation/actions', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        return dbService.moderation.findMany();
    });
    app.get('/api/v1/aggregates/areas/:areaId', async (request) => {
        const { areaId } = request.params;
        const issues = (await dbService.issues.findMany({ area_id: areaId })).filter(isPublicIssue);
        const clusters = await dbService.clusters.findMany({ area_id: areaId });
        const manifesto = await dbService.manifestos.findLatestPublished(areaId);
        const promises = await dbService.partyPromises.findMany({});
        const categoryMix = issues.reduce((acc, issue) => ({ ...acc, [issue.category]: (acc[issue.category] ?? 0) + 1 }), {});
        const statusMix = promises.reduce((acc, promise) => ({ ...acc, [promise.status]: (acc[promise.status] ?? 0) + 1 }), {});
        return {
            area_id: areaId,
            report_count: issues.length,
            support_count: (await Promise.all(issues.map(issue => dbService.supports.countByIssue(issue.id)))).reduce((sum, count) => sum + count, 0),
            verified_cluster_count: clusters.filter(cluster => cluster.status === 'verified' || cluster.status === 'manifesto_ready').length,
            manifesto_ready: Boolean(manifesto),
            adopted_promise_count: promises.length,
            completed_promise_count: promises.filter(promise => promise.status === 'completed').length,
            category_mix: categoryMix,
            status_mix: statusMix,
            last_updated: new Date(),
        };
    });
    app.get('/api/v1/exports/areas/:areaId.csv', async (request, reply) => {
        const { areaId } = request.params;
        const issues = (await dbService.issues.findMany({ area_id: areaId })).filter(isPublicIssue).map(publicIssue);
        const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = [
            ['id', 'category', 'description', 'severity', 'privacy', 'public_latitude', 'public_longitude', 'status', 'created_at'],
            ...issues.map(issue => [issue.id, issue.category, issue.description, issue.severity, issue.privacy, issue.public_latitude, issue.public_longitude, issue.status, new Date(issue.created_at).toISOString()]),
        ];
        reply.header('content-type', 'text/csv; charset=utf-8');
        reply.header('x-data-license', 'ODC-BY-1.0');
        reply.header('content-disposition', `attachment; filename="tgim-${areaId}-issues.csv"`);
        return rows.map(row => row.map(quote).join(',')).join('\n');
    });
    app.get('/api/v1/exports/manifestos/:id.pdf', async (request, reply) => {
        const { id } = request.params;
        const manifesto = await dbService.manifestos.findUnique(id);
        if (!manifesto || !manifesto.is_published)
            return reply.status(404).send({ error: 'Published manifesto not found' });
        const promises = await dbService.manifestoPromises.findByManifesto(id);
        const pdf = await renderManifestoPdf(manifesto, promises);
        reply.header('content-type', 'application/pdf');
        reply.header('content-disposition', `attachment; filename="tgim-manifesto-v${manifesto.version}.pdf"`);
        return reply.send(pdf);
    });
    // --- Outbox Dispatch Trigger ---
    // Allows an operator to republish durable pending rows into BullMQ.
    app.post('/api/v1/jobs/dispatch', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_admin']);
        if (!actor)
            return;
        const { SovereignJobPublisher } = await import('./services/job-publisher.js');
        return { dispatched: await new SovereignJobPublisher().dispatch() };
    });
    // --- Audit Logs View ---
    app.get('/api/v1/audit', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        return dbService.audit.findMany();
    });
    app.get('/api/v1/audit/page', async (request, reply) => {
        const actor = await requireActor(request, reply, ['platform_moderator', 'platform_admin']);
        if (!actor)
            return;
        const query = request.query;
        const pagination = PaginationSchema.safeParse(query);
        if (!pagination.success)
            return reply.status(400).send({ error: pagination.error.flatten() });
        let events = await dbService.audit.findMany();
        if (query.event_type)
            events = events.filter(event => event.event_type === query.event_type);
        if (query.target_table)
            events = events.filter(event => event.target_table === query.target_table);
        if (query.search) {
            const term = query.search.toLowerCase();
            events = events.filter(event => JSON.stringify(event).toLowerCase().includes(term));
        }
        const { page, page_size } = pagination.data;
        return { items: events.slice((page - 1) * page_size, page * page_size), page, page_size, total: events.length, last_updated: new Date() };
    });
    return app;
}
