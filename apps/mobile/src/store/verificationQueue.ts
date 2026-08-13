import type { SubmitVerificationInput } from '@tgim/api-client';
import { api, isApiReachable } from '../api';
import { ProtectedOperation, readProtected, safeOperationError, writeProtected } from './protectedOperationStore';

const STORE_NAME = 'verification-operations';
export type QueuedVerification = ProtectedOperation<SubmitVerificationInput>;

async function read(): Promise<QueuedVerification[]> { return (await readProtected<QueuedVerification[]>(STORE_NAME)) ?? []; }
async function write(items: QueuedVerification[]) { await writeProtected(STORE_NAME, items); }

export async function enqueueVerification(payload: SubmitVerificationInput) {
  const now = Date.now();
  const item: QueuedVerification = { id: `verification-${now}-${Math.random().toString(36).slice(2)}`, payload, state: 'queued', createdAt: now, updatedAt: now, attemptCount: 0 };
  await write([item, ...(await read())]); return item;
}

export async function syncVerifications() {
  const items = await read();
  if (!(await isApiReachable())) return { synced: 0, pending: items.filter((item) => item.state !== 'accepted').length, blocked: items.filter((item) => item.state === 'needs_attention').length };
  let synced = 0;
  for (const item of items) {
    if (item.state === 'accepted' || item.state === 'needs_attention' || item.state === 'discarded' || (item.nextAttemptAt && item.nextAttemptAt > Date.now())) continue;
    item.state = 'submitting'; item.updatedAt = Date.now(); await write(items);
    try { await api.verification.submit(item.payload); item.state = 'accepted'; item.updatedAt = Date.now(); item.serverReceipt = { id: item.id, receivedAt: Date.now() }; item.lastSafeError = undefined; synced += 1; }
    catch (error) { const classified = safeOperationError(error); item.state = classified.state; item.updatedAt = Date.now(); item.attemptCount += 1; item.nextAttemptAt = classified.retryAfterMs ? Date.now() + classified.retryAfterMs : undefined; item.lastSafeError = classified.message; }
  }
  await write(items);
  return { synced, pending: items.filter((item) => item.state !== 'accepted').length, blocked: items.filter((item) => item.state === 'needs_attention').length };
}
