import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import type { CreateIssueInput } from '@tgim/api-client';
import { api, isApiReachable } from '../api';
import { ProtectedOperation, readProtected, safeOperationError, writeProtected } from './protectedOperationStore';

const STORE_NAME = 'report-operations';
const EVIDENCE_DIRECTORY = `${FileSystem.documentDirectory}tgim-evidence/`;

export interface EvidenceReference {
  uri: string;
  filename: string;
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';
}

export interface QueuedDraft extends ProtectedOperation<CreateIssueInput> {
  idempotency_key: string;
  evidence: EvidenceReference[];
  syncedIssueId?: string;
}

type Listener = (drafts: QueuedDraft[]) => void;
let memoryCache: QueuedDraft[] | null = null;
const listeners = new Set<Listener>();
let idCounter = 0;

export function newIdempotencyKey(): string {
  idCounter += 1;
  return `draft-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6)}`;
}

async function load(): Promise<QueuedDraft[]> {
  if (memoryCache) return memoryCache;
  memoryCache = (await readProtected<QueuedDraft[]>(STORE_NAME)) ?? [];
  return memoryCache;
}

async function persist(drafts: QueuedDraft[]): Promise<void> {
  memoryCache = drafts;
  await writeProtected(STORE_NAME, drafts);
  listeners.forEach((listener) => listener(drafts));
}

async function copyEvidence(operationId: string, evidence: EvidenceReference[]): Promise<EvidenceReference[]> {
  if (!evidence.length) return [];
  await FileSystem.makeDirectoryAsync(`${EVIDENCE_DIRECTORY}${operationId}`, { intermediates: true });
  return Promise.all(evidence.map(async (item, index) => {
    const safeFilename = item.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uri = `${EVIDENCE_DIRECTORY}${operationId}/${index}-${safeFilename}`;
    await FileSystem.copyAsync({ from: item.uri, to: uri });
    return { ...item, uri };
  }));
}

export async function enqueueDraft(payload: Omit<CreateIssueInput, 'idempotency_key'>, evidence: EvidenceReference[] = []): Promise<QueuedDraft> {
  const drafts = await load();
  const idempotency_key = newIdempotencyKey();
  const now = Date.now();
  const draft: QueuedDraft = {
    id: idempotency_key,
    idempotency_key,
    payload: { ...payload, idempotency_key },
    evidence: await copyEvidence(idempotency_key, evidence),
    state: 'queued',
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
  };
  await persist([draft, ...drafts]);
  return draft;
}

async function toUpload(reference: EvidenceReference) {
  const base64 = await FileSystem.readAsStringAsync(reference.uri, { encoding: FileSystem.EncodingType.Base64 });
  return { filename: reference.filename, media_type: reference.media_type, base64 };
}

export async function sync(): Promise<{ synced: number; pending: number; blocked: number }> {
  const drafts = await load();
  const candidates = drafts.filter((draft) => draft.state !== 'accepted' && draft.state !== 'needs_attention' && draft.state !== 'discarded' && (!draft.nextAttemptAt || draft.nextAttemptAt <= Date.now()));
  if (!candidates.length) return { synced: 0, pending: drafts.filter((draft) => draft.state !== 'accepted').length, blocked: drafts.filter((draft) => draft.state === 'needs_attention').length };
  if (!(await isApiReachable())) return { synced: 0, pending: drafts.filter((draft) => draft.state !== 'accepted').length, blocked: drafts.filter((draft) => draft.state === 'needs_attention').length };

  let synced = 0;
  const next = [...drafts];
  for (const draft of candidates) {
    const index = next.findIndex((item) => item.id === draft.id);
    // Persist the transition before the network call. A process kill now
    // reopens as a retryable operation rather than a false success.
    next[index] = { ...draft, state: 'submitting', updatedAt: Date.now() };
    await persist(next);
    try {
      const uploaded = await Promise.all(draft.evidence.map(async (reference) => api.media.upload(await toUpload(reference))));
      const issue = await api.issues.create(uploaded.length ? { ...draft.payload, media: uploaded.map((item) => ({ media_url: item.media_url, media_type: item.media_type, media_hash: item.media_hash })) } : draft.payload);
      next[index] = { ...draft, state: 'accepted', syncedIssueId: issue.id, updatedAt: Date.now(), serverReceipt: { id: issue.id, receivedAt: Date.now() }, lastSafeError: undefined, nextAttemptAt: undefined };
      synced += 1;
    } catch (error) {
      const classified = safeOperationError(error);
      next[index] = { ...draft, state: classified.state, updatedAt: Date.now(), attemptCount: draft.attemptCount + 1, nextAttemptAt: classified.retryAfterMs ? Date.now() + classified.retryAfterMs : undefined, lastSafeError: classified.message };
    }
  }
  await persist(next);
  return { synced, pending: next.filter((draft) => draft.state !== 'accepted').length, blocked: next.filter((draft) => draft.state === 'needs_attention').length };
}

export async function clearSynced(): Promise<void> { await persist((await load()).filter((draft) => draft.state !== 'accepted')); }

export function useDraftQueue() {
  const [drafts, setDrafts] = useState<QueuedDraft[]>(memoryCache ?? []);
  useEffect(() => { let active = true; void load().then((items) => active && setDrafts([...items])); const listener: Listener = (items) => setDrafts([...items]); listeners.add(listener); return () => { active = false; listeners.delete(listener); }; }, []);
  return { drafts, pending: drafts.filter((draft) => draft.state !== 'accepted'), pendingCount: drafts.filter((draft) => draft.state !== 'accepted').length, blockedCount: drafts.filter((draft) => draft.state === 'needs_attention').length, enqueueDraft, sync: useCallback(() => sync(), []), clearSynced };
}
