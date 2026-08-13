import 'dotenv/config';
import { dbService } from './services/db.service.js';
import { deliverNotification, type NotificationPayload } from './services/notification.service.js';
import { generateManifestoPromises } from './services/manifesto-generator.service.js';
import { calculatePriorityScore } from '@tgim/shared';
import { pollOpen311Request, submitOpen311Request } from './services/open311-connector.service.js';
import { pathToFileURL } from 'node:url';
import { toOutboxEnvelope, validateJobPayload } from './jobs-contract.js';
import { createJobPublisher } from './services/job-publisher.js';
import { Worker } from 'bullmq';
import { closeBullMqProducer, createWorkerConnection, SOVEREIGN_QUEUE_NAME, valkeyUrl } from './services/bullmq.service.js';
import { isSovereignMode } from '@tgim/shared';
import { syncPromiseToOpenProject } from './services/openproject-sync.service.js';

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

async function runJob(job: Awaited<ReturnType<typeof dbService.jobs.claim>>) {
  if (!job) return;
  validateJobPayload(job.type, job.payload);
  if (job.type === 'notification.send') {
    const payload = job.payload as unknown as NotificationPayload;
    await dbService.notifications.create({ user_id: payload.user_id, title: payload.title, body: payload.body, data: payload.data });
    await deliverNotification(payload);
  }
  else if (job.type === 'cluster.score') {
    const { cluster_id } = job.payload as { cluster_id: string };
    const cluster = await dbService.clusters.findUnique(cluster_id);
    if (!cluster) throw new Error('Cluster not found');
    const reports = (await dbService.issues.findMany({ area_id: cluster.area_id })).filter(issue => issue.cluster_id === cluster.id);
    const supportsCount = await dbService.supports.countByCluster(cluster.id);
    await dbService.clusters.updateScore(cluster.id, calculatePriorityScore({
      averageSeverity: reports[0]?.severity ?? 'medium',
      reportsCount: reports.length,
      supportsCount,
      isVerified: cluster.status === 'verified' || cluster.status === 'manifesto_ready',
    }));
  }
  else if (job.type === 'manifesto.generate') {
    const { area_id, actor_id } = job.payload as { area_id: string; actor_id: string };
    const clusters = (await dbService.clusters.findMany({ area_id })).filter(cluster => cluster.status === 'verified' || cluster.status === 'manifesto_ready');
    if (!clusters.length) throw new Error('No verified clusters are ready for drafting');
    const manifesto = await dbService.manifestos.createDraft(area_id);
    const generated = await generateManifestoPromises(clusters);
    for (const promise of generated.promises) await dbService.manifestoPromises.create({ manifesto_id: manifesto.id, ...promise });
    await dbService.manifestos.setGenerationMetadata(manifesto.id, { generation_provider: generated.provider, generation_model: generated.model, source_cluster_ids: clusters.map(cluster => cluster.id) });
    await dbService.audit.log({ actor_id, event_type: 'manifesto.generate', target_table: 'manifestos', target_id: manifesto.id, payload: { background: true, provider: generated.provider, source_cluster_ids: clusters.map(cluster => cluster.id) } });
  }
  else if (job.type === 'external_case.submit') {
    const { issue_id, authority_id, actor_id } = job.payload as { issue_id: string; authority_id: string; actor_id: string };
    const [issue, authority] = await Promise.all([dbService.issues.findUnique(issue_id), dbService.authorities.findUnique(authority_id)]);
    if (!issue || !authority) throw new Error('Issue or authority not found');
    if (!(await dbService.reportSharingConsents.findActive(issue_id, authority_id))) throw new Error('Active recipient consent is required before an authority submission can run');
    const submitted = await submitOpen311Request(authority, issue);
    const item = await dbService.externalCases.create({ issue_id: issue.id, cluster_id: issue.cluster_id, authority_id: authority.id, service_code: authority.service_code, submitted_at: new Date(), ...submitted });
    await dbService.audit.log({ actor_id, event_type: 'external_case.submitted', target_table: 'external_grievance_cases', target_id: item.id, payload: { issue_id, authority_id, provider: item.provider, external_id: item.external_id } });
    await createJobPublisher().publish({ event_id: crypto.randomUUID(), event_type: 'external_case.poll', entity_type: 'external_case', entity_id: item.id, payload: { external_case_id: item.id }, schema_version: 1, occurred_at: new Date() });
  }
  else if (job.type === 'external_case.poll') {
    const { external_case_id } = job.payload as { external_case_id: string };
    const item = await dbService.externalCases.findUnique(external_case_id); if (!item) throw new Error('External case not found');
    const authority = await dbService.authorities.findUnique(item.authority_id); if (!authority) throw new Error('Authority not found');
    const update = await pollOpen311Request(authority, item);
    const refreshed = await dbService.externalCases.update(item.id, { ...update, closed_at: update.status === 'closed' ? new Date() : item.closed_at, last_synced_at: new Date() });
    if (!['closed', 'rejected'].includes(refreshed.status)) await createJobPublisher().publish({ event_id: crypto.randomUUID(), event_type: 'external_case.poll', entity_type: 'external_case', entity_id: item.id, payload: { external_case_id: item.id }, schema_version: 1, occurred_at: new Date() });
  }
  else if (job.type === 'openproject.sync') {
    const { party_promise_id } = job.payload as { party_promise_id: string };
    await syncPromiseToOpenProject(party_promise_id);
  }
  else throw new Error(`Unknown job type: ${job.type}`);
}

export async function processNextJob(): Promise<boolean> {
  const job = await dbService.jobs.claim();
  if (!job) return false;
  try { await runJob(job); await dbService.jobs.complete(job.id); }
  catch (error) { await dbService.jobs.fail(job.id, error instanceof Error ? error.message : 'Job failed'); }
  return true;
}

/** Consume a stored versioned outbox event. The event body is revalidated at the
 * consumer boundary, so a provider retry cannot invent a different payload. */
export async function processOutboxEvent(eventId: string): Promise<void> {
  const event = await dbService.outboxEvents.findById(eventId);
  if (!event) throw new Error('Outbox event not found');
  if ((event as any).status === 'acknowledged') return;
  const envelope = toOutboxEnvelope({ event_id: event.event_id || event.id, event_type: event.event_type || event.entity_type, payload: event.payload, occurred_at: event.occurred_at, schema_version: event.schema_version });
  const job = await dbService.jobs.enqueue(envelope.event_type, envelope.data, new Date());
  try {
    await runJob(job);
    await dbService.jobs.complete(job.id);
    await dbService.outboxEvents.markAcknowledged(event.id);
  } catch (error) {
    await dbService.jobs.fail(job.id, error instanceof Error ? error.message : 'Job failed');
    await dbService.outboxEvents.markFailed(event.id, error instanceof Error ? error.message : 'Job failed');
    throw error;
  }
}

async function startDatabaseWorker() {
  while (!stopping) {
    if (!(await processNextJob())) await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function startBullMqWorker() {
  const connection = createWorkerConnection();
  const worker = new Worker<{ eventId: string }>(
    SOVEREIGN_QUEUE_NAME,
    async job => processOutboxEvent(job.data.eventId),
    {
      connection,
      concurrency: Math.max(1, Number(process.env.BULLMQ_WORKER_CONCURRENCY || 8)),
    },
  );
  worker.on('error', error => console.error('BullMQ worker error', error));
  while (!stopping) await new Promise(resolve => setTimeout(resolve, 250));
  await worker.close();
  await connection.quit();
}

export async function startWorker() {
  if (process.env.NODE_ENV === 'production' && !isSovereignMode()) throw new Error('SOVEREIGNTY_MODE=sovereign is required in production');
  if (process.env.NODE_ENV === 'production' && !valkeyUrl()) throw new Error('VALKEY_URL is required for the production worker');
  if (isSovereignMode() && valkeyUrl()) await startBullMqWorker();
  else await startDatabaseWorker();
  await closeBullMqProducer();
  const prisma = dbService.getPrisma();
  if (prisma) await prisma.$disconnect();
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) void startWorker();
