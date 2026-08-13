import type { CivicAuthority, ExternalCaseStatus, ExternalGrievanceCase, Issue } from '@tgim/shared';

function endpoint(authority: CivicAuthority, path: string) {
  if (!authority.open311_endpoint) return null;
  return `${authority.open311_endpoint.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function mappedStatus(value: unknown): ExternalCaseStatus {
  const status = String(value || 'open').toLowerCase();
  if (status === 'closed') return 'closed';
  if (status.includes('progress')) return 'in_progress';
  if (status.includes('reject')) return 'rejected';
  if (status.includes('acknow')) return 'acknowledged';
  return 'open';
}

export async function submitOpen311Request(authority: CivicAuthority, issue: Issue) {
  const url = endpoint(authority, 'requests.json');
  // A missing authority endpoint is a configuration error, never a simulated
  // acknowledgement. Treating it as a successful local routing result makes
  // the public accountability record materially misleading.
  if (!url) throw new Error(`Open311 endpoint is not configured for authority ${authority.id}`);
  const apiKey = process.env.OPEN311_API_KEY;
  const body = new URLSearchParams({ service_code: authority.service_code, description: issue.description, lat: String(issue.exact_latitude), long: String(issue.exact_longitude) });
  if (apiKey) body.set('api_key', apiKey);
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Open311 submission failed (${response.status})`);
  const payload = await response.json() as Array<{ service_request_id?: string; service_notice?: string }>;
  const item = payload[0]; if (!item?.service_request_id) throw new Error('Open311 provider returned no service_request_id');
  return { provider: new URL(url).host, external_id: item.service_request_id, status: 'acknowledged' as const, status_notes: item.service_notice || 'Accepted by external Open311 provider.' };
}

export async function pollOpen311Request(authority: CivicAuthority, item: ExternalGrievanceCase) {
  const url = endpoint(authority, `requests/${encodeURIComponent(item.external_id)}.json`);
  if (!url) return { status: item.status, status_notes: item.status_notes };
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Open311 polling failed (${response.status})`);
  const payload = await response.json() as Array<{ status?: string; status_notes?: string }>;
  return { status: mappedStatus(payload[0]?.status), status_notes: payload[0]?.status_notes || item.status_notes };
}
