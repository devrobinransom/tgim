import type {
  DeliveryDispute,
  ExternalCaseDocument,
  ExternalGrievanceCase,
  Issue,
  IssueCluster,
  IssueMedia,
  Manifesto,
  ManifestoPromise,
  PublicDisputeOutcome,
  PublicIssue,
  VerificationEvent,
} from '@tgim/shared';

/**
 * The only allowed boundary from internal civic records into a public response.
 * Keep this module deliberately boring: it is easier to property-test and makes
 * new route review obvious when a private field is introduced.
 */
export function isPublicVisibility(record: { visibility?: string; status?: string }): boolean {
  return record.visibility === undefined
    ? record.status !== 'hidden'
    : record.visibility === 'public';
}

export function toPublicIssue(issue: Issue): PublicIssue {
  const {
    reporter_id: _reporter,
    exact_latitude: _exactLat,
    exact_longitude: _exactLng,
    idempotency_key: _idempotency,
    ...safe
  } = issue;
  return safe;
}

export function toPublicCluster(cluster: IssueCluster): IssueCluster {
  return { ...cluster };
}

export function toPublicMedia(media: IssueMedia): IssueMedia | null {
  return media.is_processed ? { ...media } : null;
}

export function toPublicVerification(event: VerificationEvent): Omit<VerificationEvent, 'verifier_id'> {
  const { verifier_id: _verifier, ...safe } = event;
  return safe;
}

export function toPublicManifesto(manifesto: Manifesto, promises: ManifestoPromise[]) {
  const { published_by: _publisher, ...safe } = manifesto;
  return { ...safe, promises };
}

export function toPublicExternalCase(item: ExternalGrievanceCase): ExternalGrievanceCase {
  // Raw provider payloads never appear in this shared shape; preserve only
  // public reference fields deliberately represented in the type.
  return { ...item };
}

export function toPublicExternalDocument(item: ExternalCaseDocument): ExternalCaseDocument | null {
  return item.is_public ? { ...item } : null;
}

export function toPublicDisputeOutcome(item: DeliveryDispute): PublicDisputeOutcome | null {
  if (!item.is_public || !item.published_at || !item.public_rationale || item.status === 'open') return null;
  return {
    id: item.id,
    party_promise_id: item.party_promise_id,
    status: item.status,
    rationale: item.public_rationale,
    published_at: item.published_at,
  };
}
