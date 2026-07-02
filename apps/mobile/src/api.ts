import { createApiClient } from '@tgim/api-client';
import { API_BASE_URL } from './config';

/** Singleton API client pointed at the (in-memory or Prisma) Fastify server. */
export const api = createApiClient({ baseUrl: API_BASE_URL });

/** Lightweight connectivity probe used by the offline draft queue + status badge. */
export async function isApiReachable(): Promise<boolean> {
  try {
    const health = await api.health();
    return health.status === 'ok';
  } catch {
    return false;
  }
}
