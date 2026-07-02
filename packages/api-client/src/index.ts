import { z } from 'zod';
import {
  Area,
  AuditEvent,
  DeliveryUpdate,
  Issue,
  IssueMedia,
  Manifesto,
  ManifestoPromise,
  PartyPromise,
  PromiseStatus,
  User,
  UserRole,
  VerificationEvent,
  CreateIssueSchema,
  SubmitVerificationSchema,
  AdoptPromiseSchema,
  AddDeliveryUpdateSchema,
} from '@tgim/shared';

/**
 * Typed client over the TGIM /api/v1 surface (apps/api/src/app.ts).
 * Plain `fetch` so it runs unchanged in React Native, the browser, and Node 18+.
 * Request shapes are inferred from the same Zod schemas the server validates with,
 * so the client cannot send a body the server will reject for shape reasons.
 */

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;
export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
export type AdoptPromiseInput = z.infer<typeof AdoptPromiseSchema>;
export type AddDeliveryUpdateInput = z.infer<typeof AddDeliveryUpdateSchema>;

export type HealthResponse = { status: string; database: 'prisma' | 'in-memory-fallback' };
export type IssueDetail = Issue & { media: IssueMedia[]; supports: number };
export type ManifestoDetail = Manifesto & { promises: ManifestoPromise[] };
export type SupportResponse = { success: boolean; support: { id: string } };
export type VerificationResponse = { success: boolean; verification: VerificationEvent };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional fetch override (tests, custom agents). Defaults to global fetch. */
  fetch?: typeof fetch;
}

export function createApiClient({ baseUrl, fetch: fetchImpl }: ApiClientOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const root = baseUrl.replace(/\/$/, '');

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await doFetch(`${root}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? JSON.stringify((parsed as { error: unknown }).error)
          : res.statusText;
      throw new ApiError(res.status, message, parsed);
    }

    return parsed as T;
  }

  function query(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params).filter(
      (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
    );
    if (entries.length === 0) return '';
    return '?' + new URLSearchParams(entries).toString();
  }

  return {
    health: () => request<HealthResponse>('GET', '/health'),

    auth: {
      setRole: (userId: string, role: UserRole) =>
        request<User>('POST', '/api/v1/auth/role', { userId, role }),
    },

    areas: {
      list: () => request<Area[]>('GET', '/api/v1/areas'),
      search: (q: string) => request<Area[]>('GET', `/api/v1/areas/search${query({ q })}`),
    },

    issues: {
      list: (filter?: { areaId?: string; category?: string }) =>
        request<Issue[]>('GET', `/api/v1/issues${query(filter ?? {})}`),
      get: (id: string) => request<IssueDetail>('GET', `/api/v1/issues/${id}`),
      create: (input: CreateIssueInput) => request<Issue>('POST', '/api/v1/issues', input),
      support: (id: string) =>
        request<SupportResponse>('POST', `/api/v1/issues/${id}/support`),
    },

    verification: {
      submit: (input: SubmitVerificationInput) =>
        request<VerificationResponse>('POST', '/api/v1/verification', input),
    },

    manifesto: {
      generate: (areaId: string) =>
        request<Manifesto>('POST', '/api/v1/manifesto/generate', { areaId }),
      get: (areaId: string) =>
        request<ManifestoDetail>('GET', `/api/v1/manifesto/${areaId}`),
    },

    party: {
      listPromises: (status?: PromiseStatus) =>
        request<PartyPromise[]>('GET', `/api/v1/party/promises${query({ status })}`),
      adopt: (input: AdoptPromiseInput) =>
        request<PartyPromise>('POST', '/api/v1/party/promises/adopt', input),
    },

    tracker: {
      updatesFor: (promiseId: string) =>
        request<DeliveryUpdate[]>('GET', `/api/v1/tracker/updates/${promiseId}`),
      addUpdate: (input: AddDeliveryUpdateInput) =>
        request<DeliveryUpdate>('POST', '/api/v1/tracker/updates', input),
    },

    audit: {
      list: () => request<AuditEvent[]>('GET', '/api/v1/audit'),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
