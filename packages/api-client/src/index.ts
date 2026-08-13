import { z } from 'zod';
import {
  Area,
  AuditEvent,
  DeliveryUpdate,
  Issue,
  PublicIssue,
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
  ApplyVolunteerSchema,
  ReviewVolunteerSchema,
  CreateDisputeSchema,
  ResolveDisputeSchema,
  NotificationPreferenceSchema,
  ModerationActionSchema,
  VolunteerApplication,
  DeliveryDispute,
  NotificationPreference,
  ModerationAction,
  AreaDashboardSummary,
  EvidenceUploadResult,
  UploadEvidenceSchema,
  UserNotification,
  PaginatedResponse,
  VerificationAssignment,
  AssignVerificationSchema,
  UpdateVerificationAssignmentSchema,
  UpdatePartyPromiseSchema,
  CivicAuthority,
  ExternalGrievanceCase,
  IssueAccountabilityRecord,
  CreateAuthoritySchema,
  LinkExternalCaseSchema,
  UpdateExternalCaseSchema,
  Open311CreateRequestSchema,
  PromiseAccountabilityRecord,
  PromiseMilestone,
  CitizenPromiseVerdict,
  ExternalCaseAppeal,
  ExternalCaseDocument,
  SubmitToAuthoritySchema,
  CreateExternalCaseAppealSchema,
  AddExternalCaseDocumentSchema,
  CreatePromiseMilestoneSchema,
  UpdatePromiseMilestoneSchema,
  CitizenPromiseVerdictSchema,
  PincodeBoundary,
  PincodeGeocodeSchema,
  PublicClusterDetail,
  Organization,
  ActorScopeGrant,
  CivicForm,
  CivicFormVersion,
  CivicFormResponseSession,
  CivicPoll,
  CivicPollResults,
  CreateCivicFormSchema,
  SubmitCivicFormSchema,
  CreateCivicPollSchema,
  CastCivicPollVoteSchema,
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
export type ApplyVolunteerInput = z.infer<typeof ApplyVolunteerSchema>;
export type ReviewVolunteerInput = z.infer<typeof ReviewVolunteerSchema>;
export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;
export type NotificationPreferenceInput = z.infer<typeof NotificationPreferenceSchema>;
export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;
export type UploadEvidenceInput = z.infer<typeof UploadEvidenceSchema>;
export type AssignVerificationInput = z.infer<typeof AssignVerificationSchema>;
export type UpdateVerificationAssignmentInput = z.infer<typeof UpdateVerificationAssignmentSchema>;
export type UpdatePartyPromiseInput = z.infer<typeof UpdatePartyPromiseSchema>;
export type CreateAuthorityInput = z.infer<typeof CreateAuthoritySchema>;
export type LinkExternalCaseInput = z.infer<typeof LinkExternalCaseSchema>;
export type UpdateExternalCaseInput = z.infer<typeof UpdateExternalCaseSchema>;
export type Open311CreateRequestInput = z.infer<typeof Open311CreateRequestSchema>;
export type SubmitToAuthorityInput = z.infer<typeof SubmitToAuthoritySchema>;
export type CreateExternalCaseAppealInput = z.infer<typeof CreateExternalCaseAppealSchema>;
export type AddExternalCaseDocumentInput = z.infer<typeof AddExternalCaseDocumentSchema>;
export type CreatePromiseMilestoneInput = z.infer<typeof CreatePromiseMilestoneSchema>;
export type UpdatePromiseMilestoneInput = z.infer<typeof UpdatePromiseMilestoneSchema>;
export type CitizenPromiseVerdictInput = z.infer<typeof CitizenPromiseVerdictSchema>;
export type PincodeGeocodeInput = z.infer<typeof PincodeGeocodeSchema>;
export type CreateCivicFormInput = z.infer<typeof CreateCivicFormSchema>;
export type SubmitCivicFormInput = z.infer<typeof SubmitCivicFormSchema>;
export type CreateCivicPollInput = z.infer<typeof CreateCivicPollSchema>;
export type CastCivicPollVoteInput = z.infer<typeof CastCivicPollVoteSchema>;

export type HealthResponse = { status: string; database: 'prisma' | 'in-memory-fallback' };
export type IssueDetail = PublicIssue & { media: IssueMedia[]; supports: number; official_cases: ExternalGrievanceCase[] };
export type ManifestoDetail = Manifesto & { promises: ManifestoPromise[] };
export type CivicFormDetail = CivicForm & { version: CivicFormVersion };
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
  /** Optional OIDC/session token provider. Returned token is sent as a Bearer token. */
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  /** Optional headers for local demo mode or app-level request metadata. */
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
}

export function createApiClient({ baseUrl, fetch: fetchImpl, getToken, headers }: ApiClientOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const root = baseUrl.replace(/\/$/, '');

  async function resolveHeaders(body?: unknown): Promise<HeadersInit> {
    const resolvedHeaders = typeof headers === 'function' ? await headers() : headers;
    const next = new Headers(resolvedHeaders);
    if (body) next.set('Content-Type', 'application/json');

    const token = getToken ? await getToken() : null;
    if (token) next.set('Authorization', `Bearer ${token}`);
    return next;
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await doFetch(`${root}${path}`, {
      method,
      headers: await resolveHeaders(body),
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

  async function requestBlob(path: string): Promise<Blob> {
    const res = await doFetch(`${root}${path}`, { headers: await resolveHeaders() });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return res.blob();
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
      me: () => request<{ user: User; organizations: Array<Organization & { membership_role: string }>; grants: ActorScopeGrant[] }>('GET', '/api/v1/auth/me'),
      setRole: (userId: string, role: UserRole) =>
        request<User>('POST', '/api/v1/auth/role', { userId, role }),
    },

    areas: {
      list: () => request<Area[]>('GET', '/api/v1/areas'),
      search: (q: string) => request<Area[]>('GET', `/api/v1/areas/search${query({ q })}`),
    },

    pincodes: {
      list: () => request<Array<PincodeBoundary & { centroid: { latitude: number; longitude: number } }>>('GET', '/api/v1/pincodes'),
      geocode: (input: PincodeGeocodeInput) =>
        request<{ pincode_code: string; name: string; area_id: string | null } | { error: string }>('POST', '/api/v1/geocode/pincode', input),
    },

    forms: {
      get: (slug: string) => request<CivicFormDetail>('GET', `/api/v1/forms/${encodeURIComponent(slug)}`),
      create: (input: CreateCivicFormInput) => request<CivicFormDetail>('POST', '/api/v1/forms', input),
      publish: (slug: string) => request<CivicFormDetail>('POST', `/api/v1/forms/${encodeURIComponent(slug)}/publish`),
      submit: (slug: string, input: SubmitCivicFormInput) => request<CivicFormResponseSession>('POST', `/api/v1/forms/${encodeURIComponent(slug)}/responses`, input),
      responses: (slug: string) => request<CivicFormResponseSession[]>('GET', `/api/v1/forms/${encodeURIComponent(slug)}/responses`),
    },

    polls: {
      list: (areaId?: string) => request<CivicPoll[]>('GET', `/api/v1/polls${query({ areaId })}`),
      create: (input: CreateCivicPollInput) => request<CivicPoll>('POST', '/api/v1/polls', input),
      publish: (id: string) => request<CivicPoll>('POST', `/api/v1/polls/${id}/publish`),
      vote: (id: string, input: CastCivicPollVoteInput) => request<{ receipt_id: string; poll_id: string; accepted_at: string }>('POST', `/api/v1/polls/${id}/votes`, input),
      results: (id: string) => request<CivicPollResults>('GET', `/api/v1/polls/${id}/results`),
    },

    issues: {
      list: (filter?: { areaId?: string; category?: string }) =>
        request<PublicIssue[]>('GET', `/api/v1/issues${query(filter ?? {})}`),
      get: (id: string) => request<IssueDetail>('GET', `/api/v1/issues/${id}`),
      create: (input: CreateIssueInput) => request<Issue>('POST', '/api/v1/issues', input),
      support: (id: string) =>
        request<SupportResponse>('POST', `/api/v1/issues/${id}/support`),
      page: (filter?: { page?: number; page_size?: number; areaId?: string; category?: string; status?: string; search?: string }) => request<PaginatedResponse<PublicIssue>>('GET', `/api/v1/issues/page${query(Object.fromEntries(Object.entries(filter ?? {}).map(([key, value]) => [key, value === undefined ? undefined : String(value)])))}`),
      accountability: (id: string) => request<IssueAccountabilityRecord>('GET', `/api/v1/issues/${id}/accountability`),
      linkExternalCase: (id: string, input: LinkExternalCaseInput) => request<ExternalGrievanceCase>('POST', `/api/v1/issues/${id}/external-cases`, input),
      submitToAuthority: (id: string, input: SubmitToAuthorityInput) => request<{ id: string; status: string }>('POST', `/api/v1/issues/${id}/submit-to-authority`, input),
    },

    clusters: {
      publicGet: (id: string) => request<PublicClusterDetail>('GET', `/api/v1/public/clusters/${id}`),
    },

    authorities: {
      list: (filter?: { areaId?: string; category?: string }) => request<CivicAuthority[]>('GET', `/api/v1/authorities${query(filter ?? {})}`),
      route: (category: string, areaId?: string) => request<CivicAuthority[]>('GET', `/api/v1/authorities/route${query({ category, areaId })}`),
      create: (input: CreateAuthorityInput) => request<CivicAuthority>('POST', '/api/v1/authorities', input),
    },

    externalCases: {
      update: (id: string, input: UpdateExternalCaseInput) => request<ExternalGrievanceCase>('PATCH', `/api/v1/external-cases/${id}`, input),
      documents: (id: string) => request<ExternalCaseDocument[]>('GET', `/api/v1/external-cases/${id}/documents`),
      addDocument: (id: string, input: AddExternalCaseDocumentInput) => request<ExternalCaseDocument>('POST', `/api/v1/external-cases/${id}/documents`, input),
      appeal: (id: string, input: CreateExternalCaseAppealInput) => request<ExternalCaseAppeal>('POST', `/api/v1/external-cases/${id}/appeals`, input),
    },

    open311: {
      services: () => request<Array<{ service_code: string; service_name: string; description: string; group: string }>>('GET', '/open311/v2/services.json'),
      createRequest: (input: Open311CreateRequestInput) => request<Array<{ service_request_id: string; service_notice: string; account_id: string }>>('POST', '/open311/v2/requests.json', input),
      request: (id: string) => request<Array<{ service_request_id: string; status: string; status_notes: string; service_code: string }>>('GET', `/open311/v2/requests/${id}.json`),
    },

    media: {
      upload: (input: UploadEvidenceInput) => request<EvidenceUploadResult>('POST', '/api/v1/media/uploads', input),
    },

    ai: {
      transcribeVoice: (input: { audio_base64: string; media_type: string; language: string }) =>
        request<{ transcript: string; language_code: string | null }>('POST', '/api/v1/ai/speech-to-text', input),
      speak: (input: { text: string; language: string }) =>
        request<{ audio_base64: string; media_type: string }>('POST', '/api/v1/ai/text-to-speech', input),
    },

    verification: {
      submit: (input: SubmitVerificationInput) =>
        request<VerificationResponse>('POST', '/api/v1/verification', input),
      assignments: () => request<VerificationAssignment[]>('GET', '/api/v1/verification/assignments'),
      assign: (input: AssignVerificationInput) => request<VerificationAssignment>('POST', '/api/v1/verification/assignments', input),
      updateAssignment: (id: string, input: UpdateVerificationAssignmentInput) => request<VerificationAssignment>('POST', `/api/v1/verification/assignments/${id}/status`, input),
    },

    manifesto: {
      generate: (areaId: string) =>
        request<Manifesto>('POST', '/api/v1/manifesto/generate', { areaId }),
      get: (areaId: string) =>
        request<ManifestoDetail>('GET', `/api/v1/manifesto/${areaId}`),
      publicGet: (areaId: string) =>
        request<ManifestoDetail>('GET', `/api/v1/public/manifestos/${areaId}`),
      publish: (id: string) => request<Manifesto>('POST', `/api/v1/manifesto/${id}/publish`, { confirmation: true }),
    },

    party: {
      listPromises: (status?: PromiseStatus) =>
        request<PartyPromise[]>('GET', `/api/v1/party/promises${query({ status })}`),
      adopt: (input: AdoptPromiseInput) =>
        request<PartyPromise>('POST', '/api/v1/party/promises/adopt', input),
      updatePromise: (id: string, input: UpdatePartyPromiseInput) => request<PartyPromise>('PATCH', `/api/v1/party/promises/${id}`, input),
      accountability: (id: string) => request<PromiseAccountabilityRecord>('GET', `/api/v1/public/promises/${id}/accountability`),
      createMilestone: (id: string, input: CreatePromiseMilestoneInput) => request<PromiseMilestone>('POST', `/api/v1/party/promises/${id}/milestones`, input),
      updateMilestone: (id: string, input: UpdatePromiseMilestoneInput) => request<PromiseMilestone>('PATCH', `/api/v1/promise-milestones/${id}`, input),
      verdict: (id: string, input: CitizenPromiseVerdictInput) => request<CitizenPromiseVerdict>('PUT', `/api/v1/party/promises/${id}/verdict`, input),
    },

    tracker: {
      updatesFor: (promiseId: string) =>
        request<DeliveryUpdate[]>('GET', `/api/v1/tracker/updates/${promiseId}`),
      addUpdate: (input: AddDeliveryUpdateInput) =>
        request<DeliveryUpdate>('POST', '/api/v1/tracker/updates', input),
    },

    volunteers: {
      apply: (input: ApplyVolunteerInput) => request<VolunteerApplication>('POST', '/api/v1/volunteers/applications', input),
      applications: () => request<VolunteerApplication[]>('GET', '/api/v1/volunteers/applications'),
      review: (id: string, input: ReviewVolunteerInput) => request<VolunteerApplication>('POST', `/api/v1/volunteers/applications/${id}/review`, input),
    },

    disputes: {
      list: (promiseId?: string) => request<DeliveryDispute[]>('GET', `/api/v1/disputes${query({ promiseId })}`),
      create: (input: CreateDisputeInput) => request<DeliveryDispute>('POST', '/api/v1/disputes', input),
      resolve: (id: string, input: ResolveDisputeInput) => request<DeliveryDispute>('POST', `/api/v1/disputes/${id}/resolve`, input),
    },

    notifications: {
      preferences: () => request<NotificationPreference>('GET', '/api/v1/notifications/preferences'),
      updatePreferences: (input: NotificationPreferenceInput) => request<NotificationPreference>('PUT', '/api/v1/notifications/preferences', input),
      list: () => request<UserNotification[]>('GET', '/api/v1/notifications'),
      markRead: (id: string) => request<UserNotification>('POST', `/api/v1/notifications/${id}/read`),
    },

    moderation: {
      list: () => request<ModerationAction[]>('GET', '/api/v1/moderation/actions'),
      create: (input: ModerationActionInput) => request<ModerationAction>('POST', '/api/v1/moderation/actions', input),
    },

    aggregates: {
      area: (areaId: string) => request<AreaDashboardSummary>('GET', `/api/v1/aggregates/areas/${areaId}`),
    },

    exports: {
      areaCsvUrl: (areaId: string) => `${root}/api/v1/exports/areas/${encodeURIComponent(areaId)}.csv`,
      manifestoPdf: (id: string) => requestBlob(`/api/v1/exports/manifestos/${id}.pdf`),
      manifestoPdfUrl: (id: string) => `${root}/api/v1/exports/manifestos/${id}.pdf`,
    },

    audit: {
      list: () => request<AuditEvent[]>('GET', '/api/v1/audit'),
      page: (filter?: { page?: number; page_size?: number; event_type?: string; target_table?: string; search?: string }) => request<PaginatedResponse<AuditEvent>>('GET', `/api/v1/audit/page${query(Object.fromEntries(Object.entries(filter ?? {}).map(([key, value]) => [key, value === undefined ? undefined : String(value)])))}`),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
