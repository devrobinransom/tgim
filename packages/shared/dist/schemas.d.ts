import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["citizen", "volunteer", "party_lead", "department_officer", "platform_moderator", "platform_admin"]>;
export declare const IssueCategorySchema: z.ZodEnum<["water", "roads", "garbage", "health", "safety", "jobs", "transport", "housing"]>;
export declare const IssueSeveritySchema: z.ZodEnum<["low", "medium", "high", "critical"]>;
export declare const PrivacyLevelSchema: z.ZodEnum<["public", "anonymous", "blurred"]>;
export declare const CreateIssueSchema: z.ZodObject<{
    category: z.ZodEnum<["water", "roads", "garbage", "health", "safety", "jobs", "transport", "housing"]>;
    description: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    privacy: z.ZodEnum<["public", "anonymous", "blurred"]>;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        media_url: z.ZodString;
        media_type: z.ZodString;
        media_hash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        media_url: string;
        media_type: string;
        media_hash: string;
    }, {
        media_url: string;
        media_type: string;
        media_hash: string;
    }>, "many">>;
    idempotency_key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    privacy: "public" | "anonymous" | "blurred";
    latitude: number;
    longitude: number;
    idempotency_key: string;
    media?: {
        media_url: string;
        media_type: string;
        media_hash: string;
    }[] | undefined;
}, {
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    privacy: "public" | "anonymous" | "blurred";
    latitude: number;
    longitude: number;
    idempotency_key: string;
    media?: {
        media_url: string;
        media_type: string;
        media_hash: string;
    }[] | undefined;
}>;
export declare const SubmitVerificationSchema: z.ZodObject<{
    cluster_id: z.ZodString;
    outcome: z.ZodEnum<["verified", "insufficient_evidence", "duplicate", "rejected"]>;
    notes: z.ZodOptional<z.ZodString>;
    checklist: z.ZodRecord<z.ZodString, z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    cluster_id: string;
    outcome: "duplicate" | "verified" | "insufficient_evidence" | "rejected";
    checklist: Record<string, boolean>;
    notes?: string | undefined;
}, {
    cluster_id: string;
    outcome: "duplicate" | "verified" | "insufficient_evidence" | "rejected";
    checklist: Record<string, boolean>;
    notes?: string | undefined;
}>;
export declare const AdoptPromiseSchema: z.ZodObject<{
    source_promise_id: z.ZodString;
    adopted_title: z.ZodString;
    adopted_description: z.ZodString;
    target_metric: z.ZodString;
    timeline: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source_promise_id: string;
    adopted_title: string;
    adopted_description: string;
    target_metric: string;
    timeline: string;
}, {
    source_promise_id: string;
    adopted_title: string;
    adopted_description: string;
    target_metric: string;
    timeline: string;
}>;
export declare const AddDeliveryUpdateSchema: z.ZodObject<{
    party_promise_id: z.ZodString;
    status: z.ZodEnum<["draft", "published", "adopted", "completed", "on_track", "delayed", "disputed"]>;
    update_text: z.ZodString;
    evidence_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "adopted" | "completed" | "on_track" | "delayed" | "disputed";
    party_promise_id: string;
    update_text: string;
    evidence_url?: string | undefined;
}, {
    status: "draft" | "published" | "adopted" | "completed" | "on_track" | "delayed" | "disputed";
    party_promise_id: string;
    update_text: string;
    evidence_url?: string | undefined;
}>;
