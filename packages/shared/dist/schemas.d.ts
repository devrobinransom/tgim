import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["citizen", "volunteer", "party_lead", "department_officer", "platform_moderator", "platform_admin"]>;
export declare const OrganizationKindSchema: z.ZodEnum<["government", "utility", "ngo", "party", "volunteer_group", "research_institution", "platform"]>;
export declare const OrganizationRoleSchema: z.ZodEnum<["owner", "admin", "officer", "researcher", "member"]>;
export declare const ActorScopeTypeSchema: z.ZodEnum<["platform", "party", "organization", "authority", "department", "area", "research_institution"]>;
export declare const CreateScopeGrantSchema: z.ZodObject<{
    actor_id: z.ZodString;
    scope_type: z.ZodEnum<["platform", "party", "organization", "authority", "department", "area", "research_institution"]>;
    scope_id: z.ZodString;
    capabilities: z.ZodArray<z.ZodString, "many">;
    starts_at: z.ZodOptional<z.ZodString>;
    ends_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actor_id: string;
    scope_type: "platform" | "party" | "organization" | "authority" | "department" | "area" | "research_institution";
    scope_id: string;
    capabilities: string[];
    starts_at?: string | undefined;
    ends_at?: string | undefined;
}, {
    actor_id: string;
    scope_type: "platform" | "party" | "organization" | "authority" | "department" | "area" | "research_institution";
    scope_id: string;
    capabilities: string[];
    starts_at?: string | undefined;
    ends_at?: string | undefined;
}>;
export declare const CreateOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    kind: z.ZodEnum<["government", "utility", "ngo", "party", "volunteer_group", "research_institution", "platform"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    kind: "platform" | "party" | "research_institution" | "government" | "utility" | "ngo" | "volunteer_group";
}, {
    name: string;
    kind: "platform" | "party" | "research_institution" | "government" | "utility" | "ngo" | "volunteer_group";
}>;
export declare const CreateOrganizationInvitationSchema: z.ZodObject<{
    invitee_email: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "officer", "researcher", "member"]>;
    expires_in_hours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    invitee_email: string;
    role: "owner" | "admin" | "officer" | "researcher" | "member";
    expires_in_hours: number;
}, {
    invitee_email: string;
    role: "owner" | "admin" | "officer" | "researcher" | "member";
    expires_in_hours?: number | undefined;
}>;
export declare const AcceptOrganizationInvitationSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
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
    pincode_code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    idempotency_key: string;
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    privacy: "public" | "anonymous" | "blurred";
    latitude: number;
    longitude: number;
    pincode_code?: string | undefined;
    media?: {
        media_url: string;
        media_type: string;
        media_hash: string;
    }[] | undefined;
}, {
    idempotency_key: string;
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    privacy: "public" | "anonymous" | "blurred";
    latitude: number;
    longitude: number;
    pincode_code?: string | undefined;
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
    outcome: "rejected" | "duplicate" | "verified" | "insufficient_evidence";
    checklist: Record<string, boolean>;
    notes?: string | undefined;
}, {
    cluster_id: string;
    outcome: "rejected" | "duplicate" | "verified" | "insufficient_evidence";
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
    status: z.ZodEnum<["draft", "published", "adopted", "completed", "on_track", "delayed", "disputed", "deferred", "rejected", "no_update"]>;
    update_text: z.ZodString;
    evidence_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "adopted" | "completed" | "on_track" | "delayed" | "disputed" | "deferred" | "rejected" | "no_update";
    party_promise_id: string;
    update_text: string;
    evidence_url?: string | undefined;
}, {
    status: "draft" | "published" | "adopted" | "completed" | "on_track" | "delayed" | "disputed" | "deferred" | "rejected" | "no_update";
    party_promise_id: string;
    update_text: string;
    evidence_url?: string | undefined;
}>;
export declare const UpdatePartyPromiseSchema: z.ZodEffects<z.ZodObject<{
    adopted_title: z.ZodOptional<z.ZodString>;
    adopted_description: z.ZodOptional<z.ZodString>;
    target_metric: z.ZodOptional<z.ZodString>;
    timeline: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["adopted", "published", "deferred", "rejected"]>>;
    owner_department: z.ZodOptional<z.ZodString>;
    estimated_cost: z.ZodOptional<z.ZodString>;
    feasibility_notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "published" | "adopted" | "deferred" | "rejected" | undefined;
    adopted_title?: string | undefined;
    adopted_description?: string | undefined;
    target_metric?: string | undefined;
    timeline?: string | undefined;
    owner_department?: string | undefined;
    estimated_cost?: string | undefined;
    feasibility_notes?: string | undefined;
}, {
    status?: "published" | "adopted" | "deferred" | "rejected" | undefined;
    adopted_title?: string | undefined;
    adopted_description?: string | undefined;
    target_metric?: string | undefined;
    timeline?: string | undefined;
    owner_department?: string | undefined;
    estimated_cost?: string | undefined;
    feasibility_notes?: string | undefined;
}>, {
    status?: "published" | "adopted" | "deferred" | "rejected" | undefined;
    adopted_title?: string | undefined;
    adopted_description?: string | undefined;
    target_metric?: string | undefined;
    timeline?: string | undefined;
    owner_department?: string | undefined;
    estimated_cost?: string | undefined;
    feasibility_notes?: string | undefined;
}, {
    status?: "published" | "adopted" | "deferred" | "rejected" | undefined;
    adopted_title?: string | undefined;
    adopted_description?: string | undefined;
    target_metric?: string | undefined;
    timeline?: string | undefined;
    owner_department?: string | undefined;
    estimated_cost?: string | undefined;
    feasibility_notes?: string | undefined;
}>;
export declare const ApplyVolunteerSchema: z.ZodObject<{
    motivation: z.ZodString;
    languages: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    motivation: string;
    languages: string[];
}, {
    motivation: string;
    languages: string[];
}>;
export declare const ReviewVolunteerSchema: z.ZodObject<{
    status: z.ZodEnum<["approved", "rejected"]>;
    review_notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "rejected" | "approved";
    review_notes?: string | undefined;
}, {
    status: "rejected" | "approved";
    review_notes?: string | undefined;
}>;
export declare const PublishManifestoSchema: z.ZodObject<{
    confirmation: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    confirmation: true;
}, {
    confirmation: true;
}>;
export declare const CreateDisputeSchema: z.ZodObject<{
    party_promise_id: z.ZodString;
    delivery_update_id: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
    evidence_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    party_promise_id: string;
    evidence_url: string;
    reason: string;
    delivery_update_id?: string | undefined;
}, {
    party_promise_id: string;
    evidence_url: string;
    reason: string;
    delivery_update_id?: string | undefined;
}>;
export declare const ResolveDisputeSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodEnum<["needs_information", "upheld", "rejected"]>;
    resolution_notes: z.ZodString;
    publish_outcome: z.ZodDefault<z.ZodBoolean>;
    public_rationale: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "rejected" | "needs_information" | "upheld";
    resolution_notes: string;
    publish_outcome: boolean;
    public_rationale?: string | undefined;
}, {
    status: "rejected" | "needs_information" | "upheld";
    resolution_notes: string;
    publish_outcome?: boolean | undefined;
    public_rationale?: string | undefined;
}>, {
    status: "rejected" | "needs_information" | "upheld";
    resolution_notes: string;
    publish_outcome: boolean;
    public_rationale?: string | undefined;
}, {
    status: "rejected" | "needs_information" | "upheld";
    resolution_notes: string;
    publish_outcome?: boolean | undefined;
    public_rationale?: string | undefined;
}>;
export declare const NotificationPreferenceSchema: z.ZodObject<{
    channels: z.ZodArray<z.ZodEnum<["in_app", "email", "push"]>, "many">;
    saved_area_ids: z.ZodArray<z.ZodString, "many">;
    issue_updates: z.ZodBoolean;
    promise_updates: z.ZodBoolean;
    language: z.ZodEnum<["en", "hi", "mr"]>;
    push_token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    channels: ("push" | "in_app" | "email")[];
    saved_area_ids: string[];
    issue_updates: boolean;
    promise_updates: boolean;
    language: "en" | "hi" | "mr";
    push_token?: string | undefined;
}, {
    channels: ("push" | "in_app" | "email")[];
    saved_area_ids: string[];
    issue_updates: boolean;
    promise_updates: boolean;
    language: "en" | "hi" | "mr";
    push_token?: string | undefined;
}>;
export declare const ModerationActionSchema: z.ZodObject<{
    target_table: z.ZodEnum<["issues", "issue_clusters", "delivery_disputes"]>;
    target_id: z.ZodString;
    action: z.ZodEnum<["hide", "restore", "mark_duplicate", "merge", "dismiss"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    target_table: "issues" | "issue_clusters" | "delivery_disputes";
    target_id: string;
    action: "hide" | "restore" | "mark_duplicate" | "merge" | "dismiss";
}, {
    reason: string;
    target_table: "issues" | "issue_clusters" | "delivery_disputes";
    target_id: string;
    action: "hide" | "restore" | "mark_duplicate" | "merge" | "dismiss";
}>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
}, {
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const UploadEvidenceSchema: z.ZodObject<{
    filename: z.ZodString;
    media_type: z.ZodEnum<["image/jpeg", "image/png", "image/webp", "video/mp4"]>;
    base64: z.ZodString;
    sha256: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    media_type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4";
    filename: string;
    base64: string;
    sha256?: string | undefined;
}, {
    media_type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4";
    filename: string;
    base64: string;
    sha256?: string | undefined;
}>;
export declare const AssignPartyMemberSchema: z.ZodObject<{
    user_id: z.ZodString;
    party_id: z.ZodString;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id: string;
    party_id: string;
    title: string;
}, {
    user_id: string;
    party_id: string;
    title: string;
}>;
export declare const AssignVerificationSchema: z.ZodObject<{
    cluster_id: z.ZodString;
    volunteer_id: z.ZodString;
    safety_notes: z.ZodOptional<z.ZodString>;
    due_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cluster_id: string;
    volunteer_id: string;
    safety_notes?: string | undefined;
    due_at?: string | undefined;
}, {
    cluster_id: string;
    volunteer_id: string;
    safety_notes?: string | undefined;
    due_at?: string | undefined;
}>;
export declare const UpdateVerificationAssignmentSchema: z.ZodObject<{
    status: z.ZodEnum<["accepted", "completed"]>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "accepted";
}, {
    status: "completed" | "accepted";
}>;
export declare const ExternalCaseStatusSchema: z.ZodEnum<["new", "open", "acknowledged", "in_progress", "closed", "rejected", "appealed"]>;
export declare const CreateAuthoritySchema: z.ZodObject<{
    name: z.ZodString;
    jurisdiction_area_id: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["water", "roads", "garbage", "health", "safety", "jobs", "transport", "housing"]>;
    service_code: z.ZodString;
    service_name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    open311_endpoint: z.ZodOptional<z.ZodString>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    name: string;
    service_code: string;
    service_name: string;
    active: boolean;
    description?: string | undefined;
    jurisdiction_area_id?: string | undefined;
    open311_endpoint?: string | undefined;
}, {
    category: "water" | "roads" | "garbage" | "health" | "safety" | "jobs" | "transport" | "housing";
    name: string;
    service_code: string;
    service_name: string;
    description?: string | undefined;
    jurisdiction_area_id?: string | undefined;
    open311_endpoint?: string | undefined;
    active?: boolean | undefined;
}>;
export declare const LinkExternalCaseSchema: z.ZodObject<{
    authority_id: z.ZodString;
    provider: z.ZodString;
    external_id: z.ZodString;
    service_code: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["new", "open", "acknowledged", "in_progress", "closed", "rejected", "appealed"]>>;
    status_notes: z.ZodOptional<z.ZodString>;
    public_url: z.ZodOptional<z.ZodString>;
    submitted_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed";
    service_code: string;
    authority_id: string;
    provider: string;
    external_id: string;
    status_notes?: string | undefined;
    public_url?: string | undefined;
    submitted_at?: string | undefined;
}, {
    service_code: string;
    authority_id: string;
    provider: string;
    external_id: string;
    status?: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed" | undefined;
    status_notes?: string | undefined;
    public_url?: string | undefined;
    submitted_at?: string | undefined;
}>;
export declare const UpdateExternalCaseSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodEnum<["new", "open", "acknowledged", "in_progress", "closed", "rejected", "appealed"]>;
    status_notes: z.ZodOptional<z.ZodString>;
    public_url: z.ZodOptional<z.ZodString>;
    closed_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed";
    status_notes?: string | undefined;
    public_url?: string | undefined;
    closed_at?: string | undefined;
}, {
    status: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed";
    status_notes?: string | undefined;
    public_url?: string | undefined;
    closed_at?: string | undefined;
}>, {
    status: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed";
    status_notes?: string | undefined;
    public_url?: string | undefined;
    closed_at?: string | undefined;
}, {
    status: "rejected" | "open" | "new" | "acknowledged" | "in_progress" | "closed" | "appealed";
    status_notes?: string | undefined;
    public_url?: string | undefined;
    closed_at?: string | undefined;
}>;
export declare const Open311CreateRequestSchema: z.ZodObject<{
    service_code: z.ZodString;
    description: z.ZodString;
    lat: z.ZodNumber;
    long: z.ZodNumber;
    media_url: z.ZodOptional<z.ZodString>;
    attribute: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    service_code: string;
    lat: number;
    long: number;
    media_url?: string | undefined;
    attribute?: Record<string, string> | undefined;
}, {
    description: string;
    service_code: string;
    lat: number;
    long: number;
    media_url?: string | undefined;
    attribute?: Record<string, string> | undefined;
}>;
export declare const SubmitToAuthoritySchema: z.ZodObject<{
    authority_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    authority_id: string;
}, {
    authority_id: string;
}>;
export declare const GrantIssueSharingConsentSchema: z.ZodObject<{
    authority_id: z.ZodString;
    purpose: z.ZodLiteral<"external_case_submission">;
    expires_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    authority_id: string;
    purpose: "external_case_submission";
    expires_at?: string | undefined;
}, {
    authority_id: string;
    purpose: "external_case_submission";
    expires_at?: string | undefined;
}>;
export declare const CreateExternalCaseAppealSchema: z.ZodObject<{
    reason: z.ZodString;
    evidence_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    evidence_url?: string | undefined;
}, {
    reason: string;
    evidence_url?: string | undefined;
}>;
export declare const AddExternalCaseDocumentSchema: z.ZodObject<{
    title: z.ZodString;
    document_url: z.ZodString;
    media_type: z.ZodOptional<z.ZodString>;
    is_public: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    document_url: string;
    is_public: boolean;
    media_type?: string | undefined;
}, {
    title: string;
    document_url: string;
    media_type?: string | undefined;
    is_public?: boolean | undefined;
}>;
export declare const CreatePromiseMilestoneSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    sequence: z.ZodNumber;
    due_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    sequence: number;
    description?: string | undefined;
    due_at?: string | undefined;
}, {
    title: string;
    sequence: number;
    description?: string | undefined;
    due_at?: string | undefined;
}>;
export declare const UpdatePromiseMilestoneSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodEnum<["pending", "in_progress", "completed", "verified", "disputed"]>;
    completed_at: z.ZodOptional<z.ZodString>;
    evidence_url: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "disputed" | "pending" | "in_progress" | "verified";
    description?: string | undefined;
    evidence_url?: string | undefined;
    completed_at?: string | undefined;
}, {
    status: "completed" | "disputed" | "pending" | "in_progress" | "verified";
    description?: string | undefined;
    evidence_url?: string | undefined;
    completed_at?: string | undefined;
}>, {
    status: "completed" | "disputed" | "pending" | "in_progress" | "verified";
    description?: string | undefined;
    evidence_url?: string | undefined;
    completed_at?: string | undefined;
}, {
    status: "completed" | "disputed" | "pending" | "in_progress" | "verified";
    description?: string | undefined;
    evidence_url?: string | undefined;
    completed_at?: string | undefined;
}>;
export declare const CitizenPromiseVerdictSchema: z.ZodObject<{
    verdict: z.ZodEnum<["delivered", "partly_delivered", "not_delivered", "not_sure"]>;
    evidence_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    verdict: "delivered" | "partly_delivered" | "not_delivered" | "not_sure";
    evidence_url?: string | undefined;
}, {
    verdict: "delivered" | "partly_delivered" | "not_delivered" | "not_sure";
    evidence_url?: string | undefined;
}>;
export declare const PincodeGeocodeSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    latitude: number;
    longitude: number;
}, {
    latitude: number;
    longitude: number;
}>;
export declare const FormQuestionTypeSchema: z.ZodEnum<["text", "long_text", "number", "single_select", "multi_select", "rating", "boolean", "evidence"]>;
export declare const CivicFormQuestionSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "long_text", "number", "single_select", "multi_select", "rating", "boolean", "evidence"]>;
    required: z.ZodDefault<z.ZodBoolean>;
    position: z.ZodNumber;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">>;
    validation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
    key: string;
    label: string;
    required: boolean;
    position: number;
    options?: {
        value: string;
        label: string;
    }[] | undefined;
    validation?: Record<string, unknown> | undefined;
}, {
    type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
    key: string;
    label: string;
    position: number;
    options?: {
        value: string;
        label: string;
    }[] | undefined;
    validation?: Record<string, unknown> | undefined;
    required?: boolean | undefined;
}>;
export declare const CreateCivicFormSchema: z.ZodEffects<z.ZodObject<{
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "long_text", "number", "single_select", "multi_select", "rating", "boolean", "evidence"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        position: z.ZodNumber;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
        }, {
            value: string;
            label: string;
        }>, "many">>;
        validation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        required: boolean;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
    }, {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
        required?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    questions: {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        required: boolean;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
    }[];
    description?: string | undefined;
}, {
    title: string;
    slug: string;
    questions: {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
        required?: boolean | undefined;
    }[];
    description?: string | undefined;
}>, {
    title: string;
    slug: string;
    questions: {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        required: boolean;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
    }[];
    description?: string | undefined;
}, {
    title: string;
    slug: string;
    questions: {
        type: "number" | "boolean" | "text" | "long_text" | "single_select" | "multi_select" | "rating" | "evidence";
        key: string;
        label: string;
        position: number;
        options?: {
            value: string;
            label: string;
        }[] | undefined;
        validation?: Record<string, unknown> | undefined;
        required?: boolean | undefined;
    }[];
    description?: string | undefined;
}>;
export declare const SubmitCivicFormSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    area_id: z.ZodOptional<z.ZodString>;
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    idempotency_key: string;
    answers: Record<string, unknown>;
    area_id?: string | undefined;
}, {
    idempotency_key: string;
    answers: Record<string, unknown>;
    area_id?: string | undefined;
}>;
export declare const PollTypeSchema: z.ZodEnum<["single_choice", "ranked_choice", "likert", "budget_allocation"]>;
export declare const CreateCivicPollSchema: z.ZodEffects<z.ZodObject<{
    area_id: z.ZodString;
    question: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["single_choice", "ranked_choice", "likert", "budget_allocation"]>;
    starts_at: z.ZodString;
    ends_at: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">;
    eligibility: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    options: {
        value: string;
        label: string;
    }[];
    type: "single_choice" | "ranked_choice" | "likert" | "budget_allocation";
    area_id: string;
    starts_at: string;
    ends_at: string;
    question: string;
    description?: string | undefined;
    eligibility?: Record<string, unknown> | undefined;
}, {
    options: {
        value: string;
        label: string;
    }[];
    type: "single_choice" | "ranked_choice" | "likert" | "budget_allocation";
    area_id: string;
    starts_at: string;
    ends_at: string;
    question: string;
    description?: string | undefined;
    eligibility?: Record<string, unknown> | undefined;
}>, {
    options: {
        value: string;
        label: string;
    }[];
    type: "single_choice" | "ranked_choice" | "likert" | "budget_allocation";
    area_id: string;
    starts_at: string;
    ends_at: string;
    question: string;
    description?: string | undefined;
    eligibility?: Record<string, unknown> | undefined;
}, {
    options: {
        value: string;
        label: string;
    }[];
    type: "single_choice" | "ranked_choice" | "likert" | "budget_allocation";
    area_id: string;
    starts_at: string;
    ends_at: string;
    question: string;
    description?: string | undefined;
    eligibility?: Record<string, unknown> | undefined;
}>;
export declare const CastCivicPollVoteSchema: z.ZodEffects<z.ZodObject<{
    idempotency_key: z.ZodString;
    option_id: z.ZodOptional<z.ZodString>;
    ranking: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allocation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    value: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    idempotency_key: string;
    value?: number | undefined;
    option_id?: string | undefined;
    ranking?: string[] | undefined;
    allocation?: Record<string, number> | undefined;
}, {
    idempotency_key: string;
    value?: number | undefined;
    option_id?: string | undefined;
    ranking?: string[] | undefined;
    allocation?: Record<string, number> | undefined;
}>, {
    idempotency_key: string;
    value?: number | undefined;
    option_id?: string | undefined;
    ranking?: string[] | undefined;
    allocation?: Record<string, number> | undefined;
}, {
    idempotency_key: string;
    value?: number | undefined;
    option_id?: string | undefined;
    ranking?: string[] | undefined;
    allocation?: Record<string, number> | undefined;
}>;
