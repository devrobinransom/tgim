import { createHash } from 'node:crypto';
import type { OpenProjectMapping } from '@tgim/shared';
import { dbService } from './db.service.js';

const memoryMappings = new Map<string, OpenProjectMapping>();

function safePayloadHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`;
}

function customFieldLinks(metadata: Record<string, string>): Record<string, string> {
  const raw = process.env.OPENPROJECT_CUSTOM_FIELD_MAP;
  if (!raw) return {};
  try {
    const configured = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(Object.entries(configured).flatMap(([semanticName, propertyName]) => metadata[semanticName] ? [[propertyName, metadata[semanticName]]] : []));
  } catch {
    throw new Error('OPENPROJECT_CUSTOM_FIELD_MAP must be a JSON object');
  }
}

export async function syncPromiseToOpenProject(partyPromiseId: string): Promise<OpenProjectMapping> {
  const promise = await dbService.partyPromises.findUnique(partyPromiseId);
  if (!promise) throw new Error('Party promise not found');
  const source = await dbService.manifestoPromises.findUnique(promise.source_promise_id);
  const baseUrl = process.env.OPENPROJECT_URL?.replace(/\/$/, '');
  const apiKey = process.env.OPENPROJECT_API_KEY;
  const projectIdentifier = process.env.OPENPROJECT_PROJECT_IDENTIFIER;
  if (!baseUrl || !apiKey || !projectIdentifier) throw new Error('OpenProject is not configured');

  const metadata: Record<string, string> = {
    tgim_promise_id: promise.id,
    tgim_manifesto_id: source?.manifesto_id || '',
    tgim_category: '',
    tgim_source_cluster_count: source?.cluster_id ? '1' : '0',
    tgim_public_status: promise.status,
  };
  const publicPayload = {
    subject: promise.adopted_title,
    description: {
      format: 'markdown',
      raw: `${promise.adopted_description}\n\nTarget: ${promise.target_metric}\nTimeline: ${new Date(promise.timeline).toISOString()}\nTGIM promise: ${promise.id}`,
    },
    ...customFieldLinks(metadata),
  };
  const payloadHash = safePayloadHash(publicPayload);
  const prisma = dbService.getPrisma() as any;
  const existing = prisma
    ? await prisma.openProjectMapping.findUnique({ where: { party_promise_id: partyPromiseId } })
    : memoryMappings.get(partyPromiseId);

  try {
    let response: Response;
    if (existing?.work_package_id) {
      const current = await fetch(`${baseUrl}/api/v3/work_packages/${existing.work_package_id}`, { headers: { Authorization: authHeader(apiKey), Accept: 'application/hal+json' } });
      if (!current.ok) throw new Error(`OpenProject lookup failed (${current.status})`);
      const currentBody = await current.json() as { lockVersion?: number };
      response = await fetch(`${baseUrl}/api/v3/work_packages/${existing.work_package_id}`, {
        method: 'PATCH',
        headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...publicPayload, lockVersion: currentBody.lockVersion }),
      });
    } else {
      response = await fetch(`${baseUrl}/api/v3/projects/${encodeURIComponent(projectIdentifier)}/work_packages`, {
        method: 'POST',
        headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...publicPayload,
          _links: { type: { href: `/api/v3/types/${process.env.OPENPROJECT_WORK_PACKAGE_TYPE_ID || '1'}` } },
        }),
      });
    }
    if (!response.ok) throw new Error(`OpenProject sync failed (${response.status})`);
    const body = await response.json() as { id?: number | string };
    if (!body.id) throw new Error('OpenProject returned no work package ID');
    const now = new Date();
    if (prisma) {
      const mapping = await prisma.openProjectMapping.upsert({
        where: { party_promise_id: partyPromiseId },
        update: { project_identifier: projectIdentifier, work_package_id: String(body.id), status: 'synced', last_safe_error: null, last_synced_at: now },
        create: { party_promise_id: partyPromiseId, project_identifier: projectIdentifier, work_package_id: String(body.id), status: 'synced', last_synced_at: now },
      });
      await prisma.openProjectSyncEvent.create({ data: { mapping_id: mapping.id, party_promise_id: partyPromiseId, direction: 'outbound', status: 'synced', provider_receipt: String(body.id), public_payload_hash: payloadHash } });
      return mapping;
    }
    const mapping: OpenProjectMapping = { id: existing?.id || crypto.randomUUID(), party_promise_id: partyPromiseId, project_identifier: projectIdentifier, work_package_id: String(body.id), status: 'synced', last_synced_at: now, created_at: existing?.created_at || now, updated_at: now };
    memoryMappings.set(partyPromiseId, mapping);
    return mapping;
  } catch (error) {
    const safeError = error instanceof Error ? error.message.slice(0, 1000) : 'OpenProject sync failed';
    if (prisma) {
      const mapping = await prisma.openProjectMapping.upsert({ where: { party_promise_id: partyPromiseId }, update: { status: 'failed', last_safe_error: safeError }, create: { party_promise_id: partyPromiseId, project_identifier: projectIdentifier, status: 'failed', last_safe_error: safeError } });
      await prisma.openProjectSyncEvent.create({ data: { mapping_id: mapping.id, party_promise_id: partyPromiseId, direction: 'outbound', status: 'failed', last_safe_error: safeError, public_payload_hash: payloadHash } });
    }
    throw new Error(safeError, { cause: error });
  }
}

export async function getOpenProjectMapping(partyPromiseId: string): Promise<OpenProjectMapping | null> {
  const prisma = dbService.getPrisma() as any;
  if (prisma) return prisma.openProjectMapping.findUnique({ where: { party_promise_id: partyPromiseId } });
  return memoryMappings.get(partyPromiseId) ?? null;
}
