import { z } from 'zod';
import { Area, AuditEvent, DeliveryUpdate, Issue, IssueMedia, Manifesto, ManifestoPromise, PartyPromise, PromiseStatus, User, UserRole, VerificationEvent, CreateIssueSchema, SubmitVerificationSchema, AdoptPromiseSchema, AddDeliveryUpdateSchema } from '@tgim/shared';
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
export type HealthResponse = {
    status: string;
    database: 'prisma' | 'in-memory-fallback';
};
export type IssueDetail = Issue & {
    media: IssueMedia[];
    supports: number;
};
export type ManifestoDetail = Manifesto & {
    promises: ManifestoPromise[];
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
}
export declare function createApiClient({ baseUrl, fetch: fetchImpl }: ApiClientOptions): {
    health: () => Promise<HealthResponse>;
    auth: {
        setRole: (userId: string, role: UserRole) => Promise<User>;
    };
    areas: {
        list: () => Promise<Area[]>;
        search: (q: string) => Promise<Area[]>;
    };
    issues: {
        list: (filter?: {
            areaId?: string;
            category?: string;
        }) => Promise<Issue[]>;
        get: (id: string) => Promise<IssueDetail>;
        create: (input: CreateIssueInput) => Promise<Issue>;
        support: (id: string) => Promise<SupportResponse>;
    };
    verification: {
        submit: (input: SubmitVerificationInput) => Promise<VerificationResponse>;
    };
    manifesto: {
        generate: (areaId: string) => Promise<Manifesto>;
        get: (areaId: string) => Promise<ManifestoDetail>;
    };
    party: {
        listPromises: (status?: PromiseStatus) => Promise<PartyPromise[]>;
        adopt: (input: AdoptPromiseInput) => Promise<PartyPromise>;
    };
    tracker: {
        updatesFor: (promiseId: string) => Promise<DeliveryUpdate[]>;
        addUpdate: (input: AddDeliveryUpdateInput) => Promise<DeliveryUpdate>;
    };
    audit: {
        list: () => Promise<AuditEvent[]>;
    };
};
export type ApiClient = ReturnType<typeof createApiClient>;
