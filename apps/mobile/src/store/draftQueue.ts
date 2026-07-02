import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { CreateIssueInput } from '@tgim/api-client';
import { api, isApiReachable } from '../api';

/**
 * Offline-first report queue (blueprint Slice 1).
 *
 * A "Pin a Problem" submission is written to durable storage FIRST with an
 * idempotency key, so it survives a force-quit or no-signal. `sync()` then
 * drains the queue against the API; the server's idempotency_key makes retries
 * safe (a double-send creates at most one issue). This is why the wizard never
 * blocks on the network.
 *
 * Production swap: AsyncStorage → MMKV/SQLite (same interface).
 */

const STORAGE_KEY = 'tgim:draft-queue:v1';

export interface QueuedDraft {
  idempotency_key: string;
  payload: CreateIssueInput;
  createdAt: number;
  /** Issue id once successfully synced; undefined while pending. */
  syncedIssueId?: string;
  lastError?: string;
}

type Listener = (drafts: QueuedDraft[]) => void;

let memoryCache: QueuedDraft[] | null = null;
const listeners = new Set<Listener>();
let idCounter = 0;

/** Idempotency key — durable + unique enough for one device's report stream. */
export function newIdempotencyKey(): string {
  idCounter += 1;
  return `draft-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6)}`;
}

async function load(): Promise<QueuedDraft[]> {
  if (memoryCache) return memoryCache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  memoryCache = raw ? (JSON.parse(raw) as QueuedDraft[]) : [];
  return memoryCache;
}

async function persist(drafts: QueuedDraft[]): Promise<void> {
  memoryCache = drafts;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  listeners.forEach((l) => l(drafts));
}

/** Enqueue a report. Returns the queued draft; call sync() to attempt upload. */
export async function enqueueDraft(
  payload: Omit<CreateIssueInput, 'idempotency_key'>,
): Promise<QueuedDraft> {
  const drafts = await load();
  const draft: QueuedDraft = {
    idempotency_key: newIdempotencyKey(),
    payload: { ...payload, idempotency_key: '' } as CreateIssueInput,
    createdAt: Date.now(),
  };
  draft.payload.idempotency_key = draft.idempotency_key;
  await persist([draft, ...drafts]);
  return draft;
}

/** Drain pending drafts against the API. Safe to call repeatedly. */
export async function sync(): Promise<{ synced: number; pending: number }> {
  const drafts = await load();
  const pending = drafts.filter((d) => !d.syncedIssueId);
  if (pending.length === 0) return { synced: 0, pending: 0 };

  if (!(await isApiReachable())) {
    return { synced: 0, pending: pending.length };
  }

  let synced = 0;
  const next = [...drafts];
  for (const draft of pending) {
    const idx = next.findIndex((d) => d.idempotency_key === draft.idempotency_key);
    try {
      const issue = await api.issues.create(draft.payload);
      next[idx] = { ...draft, syncedIssueId: issue.id, lastError: undefined };
      synced += 1;
    } catch (err) {
      next[idx] = { ...draft, lastError: err instanceof Error ? err.message : 'sync failed' };
    }
  }
  await persist(next);
  return { synced, pending: next.filter((d) => !d.syncedIssueId).length };
}

export async function clearSynced(): Promise<void> {
  const drafts = await load();
  await persist(drafts.filter((d) => !d.syncedIssueId));
}

/** React hook exposing the live queue + pending count + a sync trigger. */
export function useDraftQueue() {
  const [drafts, setDrafts] = useState<QueuedDraft[]>(memoryCache ?? []);

  useEffect(() => {
    let active = true;
    load().then((d) => active && setDrafts([...d]));
    const listener: Listener = (d) => setDrafts([...d]);
    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const triggerSync = useCallback(() => sync(), []);

  return {
    drafts,
    pending: drafts.filter((d) => !d.syncedIssueId),
    pendingCount: drafts.filter((d) => !d.syncedIssueId).length,
    enqueueDraft,
    sync: triggerSync,
    clearSynced,
  };
}
