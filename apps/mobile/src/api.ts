import { createApiClient } from '@tgim/api-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const SESSION_STORAGE_KEY = 'tgim:session:v1';

let tokenProvider: (() => Promise<string | null | undefined> | string | null | undefined) | null = null;

export function registerAuthTokenProvider(
  provider: (() => Promise<string | null | undefined> | string | null | undefined) | null,
) {
  tokenProvider = provider;
}

async function demoHeaders(): Promise<HeadersInit> {
  if (process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') return {};
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    const role = raw ? (JSON.parse(raw) as { role?: string }).role : undefined;
    return role ? { 'x-tgim-demo-role': role } : {};
  } catch {
    return {};
  }
}

/** Singleton API client pointed at the (in-memory or Prisma) Fastify server. */
export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => tokenProvider?.(),
  headers: demoHeaders,
});

/** Lightweight connectivity probe used by the offline draft queue + status badge. */
export async function isApiReachable(): Promise<boolean> {
  try {
    const health = await api.health();
    return health.status === 'ok';
  } catch {
    return false;
  }
}
