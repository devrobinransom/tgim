import fastify from 'fastify';
import cors from '@fastify/cors';
import { dbService } from './services/db.service.js';
import { CreateIssueSchema, SubmitVerificationSchema, AdoptPromiseSchema, AddDeliveryUpdateSchema } from '@tgim/shared';
import { calculatePriorityScore } from '@tgim/shared';
export function buildApp() {
    const app = fastify({ logger: true });
    // Register CORS
    app.register(cors, {
        origin: '*',
    });
    // Health check
    app.get('/health', async () => {
        return { status: 'ok', database: dbService.isPrismaEnabled() ? 'prisma' : 'in-memory-fallback' };
    });
    // --- Identity / Sandbox Role Switching ---
    app.post('/api/v1/auth/role', async (request, reply) => {
        const { userId, role } = request.body;
        try {
            const updated = await dbService.users.updateRole(userId, role);
            await dbService.audit.log({
                actor_id: userId,
                event_type: 'user.role_update',
                target_table: 'users',
                target_id: userId,
                payload: { new_role: role }
            });
            return updated;
        }
        catch (e) {
            reply.status(404).send({ error: e.message });
        }
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
    // --- Citizen Issue Reporting ---
    app.post('/api/v1/issues', async (request, reply) => {
        // Validate request body
        const parseResult = CreateIssueSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { category, description, severity, privacy, latitude, longitude, media, idempotency_key } = parseResult.data;
        // Simulate reporter ID (using default citizen)
        const reporterId = 'default-citizen-id';
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
        return dbService.issues.findMany({ area_id: areaId, category });
    });
    app.get('/api/v1/issues/:id', async (request, reply) => {
        const { id } = request.params;
        const issue = await dbService.issues.findUnique(id);
        if (!issue)
            return reply.status(404).send({ error: 'Issue not found' });
        const media = await dbService.media.findByIssue(id);
        const supports = await dbService.supports.countByIssue(id);
        return { ...issue, media, supports };
    });
    app.post('/api/v1/issues/:id/support', async (request, reply) => {
        const { id } = request.params;
        const userId = 'default-citizen-id'; // Mock user support
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
    app.post('/api/v1/verification', async (request, reply) => {
        const parseResult = SubmitVerificationSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { cluster_id, outcome, notes, checklist } = parseResult.data;
        const verifierId = 'default-volunteer-id';
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
            return { success: true, verification };
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    // --- Manifesto Curation & AI Mock Generation ---
    app.post('/api/v1/manifesto/generate', async (request, reply) => {
        const { areaId } = request.body;
        if (!areaId)
            return reply.status(400).send({ error: 'areaId is required' });
        try {
            // Create new draft manifesto
            const manifesto = await dbService.manifestos.createDraft(areaId);
            // Fetch verified issue clusters in this area
            const clusters = await dbService.clusters.findMany({ area_id: areaId });
            const verifiedClusters = clusters.filter(c => c.status === 'verified' || c.status === 'draft'); // Allow draft clusters for mockup seeding
            // Generate manifesto promises for each cluster (Mocking AI generation with cited source IDs)
            const timeHorizons = ['100-day', '1-year', '3-year', '5-year'];
            for (let i = 0; i < verifiedClusters.length; i++) {
                const cluster = verifiedClusters[i];
                const time_horizon = timeHorizons[i % timeHorizons.length];
                await dbService.manifestoPromises.create({
                    manifesto_id: manifesto.id,
                    cluster_id: cluster.id,
                    time_horizon,
                    title: `Address ${cluster.category} issue: ${cluster.title}`,
                    description: `AI-generated promise addressing: ${cluster.summary || 'citizen issues'}. Focus on fixing ${cluster.category} safety.`,
                    target_metric: `Fix at least 90% of local reports`
                });
            }
            await dbService.audit.log({
                actor_id: 'default-party-id',
                event_type: 'manifesto.generate',
                target_table: 'manifestos',
                target_id: manifesto.id,
                payload: { promises_count: verifiedClusters.length }
            });
            return reply.status(201).send(manifesto);
        }
        catch (e) {
            return reply.status(500).send({ error: e.message });
        }
    });
    app.get('/api/v1/manifesto/:areaId', async (request, reply) => {
        const { areaId } = request.params;
        const manifesto = await dbService.manifestos.findLatest(areaId);
        if (!manifesto)
            return reply.status(404).send({ error: 'No manifesto found for this area' });
        const promises = await dbService.manifestoPromises.findByManifesto(manifesto.id);
        return { ...manifesto, promises };
    });
    // --- Party Studio ---
    app.post('/api/v1/party/promises/adopt', async (request, reply) => {
        const parseResult = AdoptPromiseSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { source_promise_id, adopted_title, adopted_description, target_metric, timeline } = parseResult.data;
        const partyId = 'party-profile-1-id';
        const actorId = 'default-party-id';
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
                actor_id: actorId,
                event_type: 'promise.adopt',
                target_table: 'party_promises',
                target_id: partyPromise.id,
                payload: { source_promise_id }
            });
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
    // --- Delivery Tracker ---
    app.post('/api/v1/tracker/updates', async (request, reply) => {
        const parseResult = AddDeliveryUpdateSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({ error: parseResult.error.flatten() });
        }
        const { party_promise_id, status, update_text, evidence_url } = parseResult.data;
        const updaterId = 'default-officer-id';
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
    // --- Audit Logs View ---
    app.get('/api/v1/audit', async () => {
        return dbService.audit.findMany();
    });
    return app;
}
