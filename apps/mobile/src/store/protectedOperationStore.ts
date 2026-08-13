import * as SecureStore from 'expo-secure-store';

/**
 * A small encrypted record store for offline civic operations.
 *
 * SecureStore entries are deliberately chunked: platform implementations impose
 * per-value limits, while issue descriptions and operation metadata can exceed
 * them. Evidence bytes never enter this store; operations retain only a local
 * file reference and upload the file when connectivity is available.
 */
const PREFIX = 'tgim:protected-operation:v1';
const CHUNK_SIZE = 1_700;

export type OperationState = 'local_draft' | 'queued' | 'submitting' | 'accepted' | 'retryable_error' | 'needs_attention' | 'discarded';

export interface ProtectedOperation<T> {
  id: string;
  state: OperationState;
  payload: T;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  nextAttemptAt?: number;
  lastSafeError?: string;
  serverReceipt?: { id: string; receivedAt: number };
}

function manifestKey(name: string) { return `${PREFIX}:${name}:manifest`; }
function chunkKey(name: string, index: number) { return `${PREFIX}:${name}:${index}`; }

export async function readProtected<T>(name: string): Promise<T | null> {
  const rawManifest = await SecureStore.getItemAsync(manifestKey(name));
  if (!rawManifest) return null;
  const manifest = JSON.parse(rawManifest) as { chunks: number };
  const parts = await Promise.all(Array.from({ length: manifest.chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(name, index))));
  if (parts.some((part) => part === null)) {
    await removeProtected(name, manifest.chunks);
    return null;
  }
  return JSON.parse(parts.join('')) as T;
}

export async function writeProtected<T>(name: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  const chunks = Array.from({ length: Math.ceil(serialized.length / CHUNK_SIZE) || 1 }, (_, index) => serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
  const previous = await SecureStore.getItemAsync(manifestKey(name));
  const previousCount = previous ? (JSON.parse(previous) as { chunks: number }).chunks : 0;
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(name, index), chunk)));
  await SecureStore.setItemAsync(manifestKey(name), JSON.stringify({ chunks: chunks.length }));
  await Promise.all(Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, index) => SecureStore.deleteItemAsync(chunkKey(name, chunks.length + index))));
}

export async function removeProtected(name: string, knownChunks?: number): Promise<void> {
  const rawManifest = knownChunks === undefined ? await SecureStore.getItemAsync(manifestKey(name)) : null;
  const chunks = knownChunks ?? (rawManifest ? (JSON.parse(rawManifest) as { chunks: number }).chunks : 0);
  await Promise.all(Array.from({ length: chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(name, index))));
  await SecureStore.deleteItemAsync(manifestKey(name));
}

export function safeOperationError(error: unknown): { state: 'retryable_error' | 'needs_attention'; message: string; retryAfterMs?: number } {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : undefined;
  if (status === 401 || status === 403 || status === 422) return { state: 'needs_attention', message: 'Action needs attention before it can be sent.' };
  if (status === 429) return { state: 'retryable_error', message: 'Service is busy; TGIM will retry safely.', retryAfterMs: 60_000 };
  if (status && status >= 400 && status < 500) return { state: 'needs_attention', message: 'This saved action needs review before it can be sent.' };
  return { state: 'retryable_error', message: 'Connection unavailable; TGIM will retry safely.', retryAfterMs: 15_000 };
}
