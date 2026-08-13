import { z } from 'zod';
import { Area, AuditEvent, DeliveryUpdate, Issue, PublicIssue, IssueMedia, Manifesto, ManifestoPromise, PartyPromise, PromiseStatus, User, UserRole, VerificationEvent, CreateIssueSchema, SubmitVerificationSchema, AdoptPromiseSchema, AddDeliveryUpdateSchema, ApplyVolunteerSchema, ReviewVolunteerSchema, CreateDisputeSchema, ResolveDisputeSchema, NotificationPreferenceSchema, ModerationActionSchema, VolunteerApplication, DeliveryDispute, NotificationPreference, ModerationAction, AreaDashboardSummary, EvidenceUploadResult, UploadEvidenceSchema, UserNotification, PaginatedResponse, VerificationAssignment, AssignVerificationSchema, UpdateVerificationAssignmentSchema, UpdatePartyPromiseSchema, CivicAuthority, ExternalGrievanceCase, IssueAccountabilityRecord, CreateAuthoritySchema, LinkExternalCaseSchema, UpdateExternalCaseSchema, Open311CreateRequestSchema, PromiseAccountabilityRecord, PromiseMilestone, CitizenPromiseVerdict, ExternalCaseAppeal, ExternalCaseDocument, SubmitToAuthoritySchema, CreateExternalCaseAppealSchema, AddExternalCaseDocumentSchema, CreatePromiseMilestoneSchema, UpdatePromiseMilestoneSchema, CitizenPromiseVerdictSchema, PincodeBoundary, PincodeGeocodeSchema, PublicClusterDetail, Organization, ActorScopeGrant, CivicForm, CivicFormVersion, CivicFormResponseSession, CivicPoll, CivicPollResults, CreateCivicFormSchema, SubmitCivicFormSchema, CreateCivicPollSchema, CastCivicPollVoteSchema } from '@tgim/shared';
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
export type HealthResponse = {
    status: string;
    database: 'prisma' | 'in-memory-fallback';
};
export type IssueDetail = PublicIssue & {
    media: IssueMedia[];
    supports: number;
    official_cases: ExternalGrievanceCase[];
};
export type ManifestoDetail = Manifesto & {
    promises: ManifestoPromise[];
};
export type CivicFormDetail = CivicForm & {
    version: CivicFormVersion;
};
export type SupportResponse = {
    success: boolean;
    support: {
        id: string;
    };
};
export type VerificationResponse = {
    success: boolean;
    verification: VerificationEvent;
};
export declare class ApiError extends Error {
    status: number;
    body?: unknown | undefined;
    constructor(status: number, message: string, body?: unknown | undefined);
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
export declare function createApiClient({ baseUrl, fetch: fetchImpl, getToken, headers }: ApiClientOptions): {
    health: () => Promise<HealthResponse>;
    auth: {
        me: () => Promise<{
            user: User;
            organizations: Array<Organization & {
                membership_role: string;
            }>;
            grants: ActorScopeGrant[];
        }>;
        setRole: (userId: string, role: UserRole) => Promise<User>;
    };
    areas: {
        list: () => Promise<Area[]>;
        search: (q: string) => Promise<Area[]>;
    };
    pincodes: {
        list: () => Promise<(PincodeBoundary & {
            centroid: {
                latitude: number;
                longitude: number;
            };
        })[]>;
        geocode: (input: PincodeGeocodeInput) => Promise<{
            pincode_code: string;
            name: string;
            area_id: string | null;
        } | {
            error: string;
        }>;
    };
    forms: {
        get: (slug: string) => Promise<CivicFormDetail>;
        create: (input: CreateCivicFormInput) => Promise<CivicFormDetail>;
        publish: (slug: string) => Promise<CivicFormDetail>;
        submit: (slug: string, input: SubmitCivicFormInput) => Promise<CivicFormResponseSession>;
        responses: (slug: string) => Promise<CivicFormResponseSession[]>;
    };
    polls: {
        list: (areaId?: string) => Promise<CivicPoll[]>;
        create: (input: CreateCivicPollInput) => Promise<CivicPoll>;
        publish: (id: string) => Promise<CivicPoll>;
        vote: (id: string, input: CastCivicPollVoteInput) => Promise<{
            receipt_id: string;
            poll_id: string;
            accepted_at: string;
        }>;
        results: (id: string) => Promise<CivicPollResults>;
    };
    issues: {
        list: (filter?: {
            areaId?: string;
            category?: string;
        }) => Promise<PublicIssue[]>;
        get: (id: string) => Promise<IssueDetail>;
        create: (input: CreateIssueInput) => Promise<Issue>;
        support: (id: string) => Promise<SupportResponse>;
        page: (filter?: {
            page?: number;
            page_size?: number;
            areaId?: string;
            category?: string;
            status?: string;
            search?: string;
        }) => Promise<PaginatedResponse<PublicIssue>>;
        accountability: (id: string) => Promise<IssueAccountabilityRecord>;
        linkExternalCase: (id: string, input: LinkExternalCaseInput) => Promise<ExternalGrievanceCase>;
        submitToAuthority: (id: string, input: SubmitToAuthorityInput) => Promise<{
            id: string;
            status: string;
        }>;
    };
    clusters: {
        publicGet: (id: string) => Promise<PublicClusterDetail>;
    };
    authorities: {
        list: (filter?: {
            areaId?: string;
            category?: string;
        }) => Promise<CivicAuthority[]>;
        route: (category: string, areaId?: string) => Promise<CivicAuthority[]>;
        create: (input: CreateAuthorityInput) => Promise<CivicAuthority>;
    };
    externalCases: {
        update: (id: string, input: UpdateExternalCaseInput) => Promise<ExternalGrievanceCase>;
        documents: (id: string) => Promise<ExternalCaseDocument[]>;
        addDocument: (id: string, input: AddExternalCaseDocumentInput) => Promise<ExternalCaseDocument>;
        appeal: (id: string, input: CreateExternalCaseAppealInput) => Promise<ExternalCaseAppeal>;
    };
    open311: {
        services: () => Promise<{
            service_code: string;
            service_name: string;
            description: string;
            group: string;
        }[]>;
        createRequest: (input: Open311CreateRequestInput) => Promise<{
            service_request_id: string;
            service_notice: string;
            account_id: string;
        }[]>;
        request: (id: string) => Promise<{
            service_request_id: string;
            status: string;
            status_notes: string;
            service_code: string;
        }[]>;
    };
    media: {
        upload: (input: UploadEvidenceInput) => Promise<EvidenceUploadResult>;
    };
    ai: {
        transcribeVoice: (input: {
            audio_base64: string;
            media_type: string;
            language: string;
        }) => Promise<{
            transcript: string;
            language_code: string | null;
        }>;
        speak: (input: {
            text: string;
            language: string;
        }) => Promise<{
            audio_base64: string;
            media_type: string;
        }>;
    };
    verification: {
        submit: (input: SubmitVerificationInput) => Promise<VerificationResponse>;
        assignments: () => Promise<VerificationAssignment[]>;
        assign: (input: AssignVerificationInput) => Promise<VerificationAssignment>;
        updateAssignment: (id: string, input: UpdateVerificationAssignmentInput) => Promise<VerificationAssignment>;
    };
    manifesto: {
        generate: (areaId: string) => Promise<Manifesto>;
        get: (areaId: string) => Promise<ManifestoDetail>;
        publicGet: (areaId: string) => Promise<ManifestoDetail>;
        publish: (id: string) => Promise<Manifesto>;
    };
    party: {
        listPromises: (status?: PromiseStatus) => Promise<PartyPromise[]>;
        adopt: (input: AdoptPromiseInput) => Promise<PartyPromise>;
        updatePromise: (id: string, input: UpdatePartyPromiseInput) => Promise<PartyPromise>;
        accountability: (id: string) => Promise<PromiseAccountabilityRecord>;
        createMilestone: (id: string, input: CreatePromiseMilestoneInput) => Promise<PromiseMilestone>;
        updateMilestone: (id: string, input: UpdatePromiseMilestoneInput) => Promise<PromiseMilestone>;
        verdict: (id: string, input: CitizenPromiseVerdictInput) => Promise<CitizenPromiseVerdict>;
    };
    tracker: {
        updatesFor: (promiseId: string) => Promise<DeliveryUpdate[]>;
        addUpdate: (input: AddDeliveryUpdateInput) => Promise<DeliveryUpdate>;
    };
    volunteers: {
        apply: (input: ApplyVolunteerInput) => Promise<VolunteerApplication>;
        applications: () => Promise<VolunteerApplication[]>;
        review: (id: string, input: ReviewVolunteerInput) => Promise<VolunteerApplication>;
    };
    disputes: {
        list: (promiseId?: string) => Promise<DeliveryDispute[]>;
        create: (input: CreateDisputeInput) => Promise<DeliveryDispute>;
        resolve: (id: string, input: ResolveDisputeInput) => Promise<DeliveryDispute>;
    };
    notifications: {
        preferences: () => Promise<NotificationPreference>;
        updatePreferences: (input: NotificationPreferenceInput) => Promise<NotificationPreference>;
        list: () => Promise<UserNotification[]>;
        markRead: (id: string) => Promise<UserNotification>;
    };
    moderation: {
        list: () => Promise<ModerationAction[]>;
        create: (input: ModerationActionInput) => Promise<ModerationAction>;
    };
    aggregates: {
        area: (areaId: string) => Promise<AreaDashboardSummary>;
    };
    exports: {
        areaCsvUrl: (areaId: string) => string;
        manifestoPdf: (id: string) => Promise<Blob>;
        manifestoPdfUrl: (id: string) => string;
    };
    audit: {
        list: () => Promise<AuditEvent[]>;
        page: (filter?: {
            page?: number;
            page_size?: number;
            event_type?: string;
            target_table?: string;
            search?: string;
        }) => Promise<PaginatedResponse<AuditEvent>>;
    };
};
export type ApiClient = ReturnType<typeof createApiClient>;
