import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../dist/app.js';

const jsonHeaders = { 'content-type': 'application/json' };
const role = value => ({ ...jsonHeaders, 'x-tgim-demo-role': value });

test('public issue DTO never exposes exact location or reporter identity', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/api/v1/issues' });
  assert.equal(response.statusCode, 200);
  const [issue] = response.json();
  assert.ok(issue);
  assert.equal('exact_latitude' in issue, false);
  assert.equal('exact_longitude' in issue, false);
  assert.equal('reporter_id' in issue, false);
  assert.equal(typeof issue.public_latitude, 'number');
});

test('volunteer applications require admin review and write audit events', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const created = await app.inject({
    method: 'POST', url: '/api/v1/volunteers/applications', headers: role('citizen'),
    payload: { motivation: 'I can verify civic reports safely and consistently.', languages: ['en'] },
  });
  assert.equal(created.statusCode, 201);
  const application = created.json();
  const forbidden = await app.inject({ method: 'GET', url: '/api/v1/volunteers/applications', headers: role('citizen') });
  assert.equal(forbidden.statusCode, 403);
  const reviewed = await app.inject({
    method: 'POST', url: `/api/v1/volunteers/applications/${application.id}/review`, headers: role('platform_admin'),
    payload: { status: 'approved', review_notes: 'Identity and field readiness reviewed.' },
  });
  assert.equal(reviewed.statusCode, 200);
  const audit = await app.inject({ method: 'GET', url: '/api/v1/audit', headers: role('platform_admin') });
  assert.ok(audit.json().some(event => event.event_type === 'volunteer.approved'));
});

test('preferences and area aggregates are authenticated and privacy safe', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const preference = await app.inject({
    method: 'PUT', url: '/api/v1/notifications/preferences', headers: role('citizen'),
    payload: { channels: ['in_app', 'push'], saved_area_ids: ['ward-12-id'], issue_updates: true, promise_updates: true, language: 'en' },
  });
  assert.equal(preference.statusCode, 200);
  const aggregate = await app.inject({ method: 'GET', url: '/api/v1/aggregates/areas/ward-12-id' });
  assert.equal(aggregate.statusCode, 200);
  assert.equal(aggregate.json().report_count >= 1, true);
  assert.equal('exact_latitude' in aggregate.json(), false);
});

test('manifesto generation preserves evidence provenance and requires human publication', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const generated = await app.inject({
    method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'), payload: { areaId: 'ward-12-id' },
  });
  assert.equal(generated.statusCode, 201);
  assert.equal(generated.json().generation_provider, 'deterministic');
  assert.equal(generated.json().is_published, false);
  assert.deepEqual(generated.json().source_cluster_ids, ['de1bcf20-1a42-4912-8824-c10df8a8470a']);
  const draft = await app.inject({ method: 'GET', url: '/api/v1/manifesto/ward-12-id' });
  assert.ok([200, 404].includes(draft.statusCode));
  if (draft.statusCode === 200) {
    assert.equal(draft.json().is_published, true);
    assert.notEqual(draft.json().id, generated.json().id);
  }
  const published = await app.inject({
    method: 'POST', url: `/api/v1/manifesto/${generated.json().id}/publish`, headers: role('party_lead'), payload: { confirmation: true },
  });
  assert.equal(published.statusCode, 200);
  assert.equal(published.json().is_published, true);
});

test('CSV research export contains only public-safe coordinates', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/api/v1/exports/areas/ward-12-id.csv' });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.match(response.body, /public_latitude/);
  assert.doesNotMatch(response.body, /exact_latitude|reporter_id/);
});

test('evidence upload strips metadata into a processed public derivative', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==';
  const upload = await app.inject({ method: 'POST', url: '/api/v1/media/uploads', headers: role('citizen'), payload: { filename: 'evidence.png', media_type: 'image/png', base64 } });
  assert.equal(upload.statusCode, 201, upload.body);
  assert.equal(upload.json().media_type, 'image/webp');
  assert.equal(upload.json().width, 2);
  const path = new URL(upload.json().media_url).pathname;
  const image = await app.inject({ method: 'GET', url: path });
  assert.equal(image.statusCode, 200);
  assert.match(image.headers['content-type'], /image\/webp/);
});

test('published manifesto exports PDF and delivery updates retain a durable notification event until a provider is configured', async t => {
  const app = buildApp();
  t.after(() => app.close());
  await app.inject({ method: 'PUT', url: '/api/v1/notifications/preferences', headers: role('citizen'), payload: { channels: ['in_app'], saved_area_ids: [], issue_updates: true, promise_updates: true, language: 'en' } });
  const generated = await app.inject({ method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'), payload: { areaId: 'ward-12-id' } });
  const source = generated.json().promises[0];
  const adopted = await app.inject({ method: 'POST', url: '/api/v1/party/promises/adopt', headers: role('party_lead'), payload: { source_promise_id: source.id, adopted_title: source.title, adopted_description: source.description, target_metric: source.target_metric, timeline: new Date(Date.now() + 86400000).toISOString() } });
  assert.equal(adopted.statusCode, 201, adopted.body);
  const costed = await app.inject({ method: 'PATCH', url: `/api/v1/party/promises/${adopted.json().id}`, headers: role('party_lead'), payload: { owner_department: 'Roads Department', estimated_cost: 'Department estimate pending', feasibility_notes: 'Requires site survey and tender approval.' } });
  assert.equal(costed.statusCode, 200, costed.body);
  assert.equal(costed.json().owner_department, 'Roads Department');
  await app.inject({ method: 'POST', url: `/api/v1/manifesto/${generated.json().id}/publish`, headers: role('party_lead'), payload: { confirmation: true } });
  const pdf = await app.inject({ method: 'GET', url: `/api/v1/exports/manifestos/${generated.json().id}.pdf` });
  assert.equal(pdf.statusCode, 200);
  assert.equal(pdf.rawPayload.subarray(0, 4).toString(), '%PDF');
  const update = await app.inject({ method: 'POST', url: '/api/v1/tracker/updates', headers: role('department_officer'), payload: { party_promise_id: adopted.json().id, status: 'on_track', update_text: 'Work package approved and scheduled for public progress reporting.' } });
  assert.equal(update.statusCode, 201, update.body);
  const outbox = await app.inject({ method: 'GET', url: '/api/v1/operations/outbox', headers: role('platform_admin') });
  assert.ok(outbox.json().some(event => event.event_type === 'notification.send' && event.status === 'pending'));
});

test('verification assignments include safety guidance and complete with field review', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const assigned = await app.inject({ method: 'POST', url: '/api/v1/verification/assignments', headers: role('platform_admin'), payload: { cluster_id: 'de1bcf20-1a42-4912-8824-c10df8a8470a', volunteer_id: 'default-volunteer-id', safety_notes: 'Visit in daylight with a partner.', due_at: new Date(Date.now() + 86400000).toISOString() } });
  assert.equal(assigned.statusCode, 201, assigned.body);
  const list = await app.inject({ method: 'GET', url: '/api/v1/verification/assignments', headers: role('volunteer') });
  assert.ok(list.json().some(item => item.safety_notes.includes('daylight')));
  const accepted = await app.inject({ method: 'POST', url: `/api/v1/verification/assignments/${assigned.json().id}/status`, headers: role('volunteer'), payload: { status: 'accepted' } });
  assert.equal(accepted.json().status, 'accepted');
});

test('paginated public issue search remains privacy safe', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/api/v1/issues/page?page=1&page_size=1&search=water' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().page_size, 1);
  assert.equal('exact_latitude' in response.json().items[0], false);
});

test('moderation changes public query eligibility and disputes remain internal', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const submitted = await app.inject({
    method: 'POST', url: '/api/v1/issues', headers: role('citizen'),
    payload: {
      category: 'water', description: 'A report used only to verify moderation visibility.',
      severity: 'low', privacy: 'blurred', latitude: 19.076, longitude: 72.8777,
      idempotency_key: `moderation-visibility-${Date.now()}`,
    },
  });
  assert.equal(submitted.statusCode, 201, submitted.body);
  const issueId = submitted.json().id;
  const hidden = await app.inject({
    method: 'POST', url: '/api/v1/moderation/actions', headers: role('platform_moderator'),
    payload: { target_table: 'issues', target_id: issueId, action: 'hide', reason: 'Contains identifying details requiring review.' },
  });
  assert.equal(hidden.statusCode, 201, hidden.body);
  const detail = await app.inject({ method: 'GET', url: `/api/v1/issues/${issueId}` });
  assert.equal(detail.statusCode, 404);
  const issues = await app.inject({ method: 'GET', url: '/api/v1/issues' });
  assert.equal(issues.json().some(item => item.id === issueId), false);
  const disputes = await app.inject({ method: 'GET', url: '/api/v1/disputes', headers: role('citizen') });
  assert.equal(disputes.statusCode, 403);
  const internal = await app.inject({ method: 'GET', url: '/api/v1/disputes', headers: role('platform_moderator') });
  assert.equal(internal.statusCode, 200);
});

test('tenant admins can invite only into their own organization', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const organization = await app.inject({
    method: 'POST', url: '/api/v1/organizations', headers: role('platform_admin'),
    payload: { name: `Mumbai water partners ${crypto.randomUUID()}`, kind: 'ngo' },
  });
  assert.equal(organization.statusCode, 201, organization.body);
  const invitation = await app.inject({
    method: 'POST', url: `/api/v1/organizations/${organization.json().id}/invitations`, headers: role('platform_admin'),
    payload: { invitee_email: 'citizen@example.test', role: 'researcher', expires_in_hours: 24 },
  });
  assert.equal(invitation.statusCode, 201, invitation.body);
  assert.equal('token_hash' in invitation.json(), false);
  const accepted = await app.inject({ method: 'POST', url: '/api/v1/organization-invitations/accept', headers: role('citizen'), payload: { token: invitation.json().invitation_token } });
  assert.equal(accepted.statusCode, 201, accepted.body);
  assert.equal(accepted.json().organization_id, organization.json().id);
  assert.equal(accepted.json().role, 'researcher');
  const mine = await app.inject({ method: 'GET', url: '/api/v1/organizations/mine', headers: role('citizen') });
  assert.ok(mine.json().some(item => item.id === organization.json().id && item.membership_role === 'researcher'));
});

test('MCP rejects unauthenticated requests even when demo authentication is enabled', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/mcp', payload: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'mcp_unauthorized');
});

test('public cluster and manifesto records are read-only and privacy safe', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const verification = await app.inject({
    method: 'POST', url: '/api/v1/verification', headers: role('volunteer'),
    payload: { cluster_id: 'de1bcf20-1a42-4912-8824-c10df8a8470a', outcome: 'verified', notes: 'Public detail contract test.', checklist: { location_matches: true } },
  });
  assert.equal(verification.statusCode, 200, verification.body);
  const cluster = await app.inject({ method: 'GET', url: '/api/v1/public/clusters/de1bcf20-1a42-4912-8824-c10df8a8470a' });
  assert.equal(cluster.statusCode, 200, cluster.body);
  assert.equal(cluster.json().report_count >= 1, true);
  assert.equal('verifier_id' in cluster.json().verifications[0], false);
  assert.equal('exact_latitude' in cluster.json().issues[0], false);
  assert.equal('reporter_id' in cluster.json().issues[0], false);

  const draft = await app.inject({ method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'), payload: { areaId: 'ward-12-id' } });
  assert.equal(draft.statusCode, 201, draft.body);
  const unpublished = await app.inject({ method: 'GET', url: '/api/v1/public/manifestos/ward-12-id' });
  if (unpublished.statusCode === 200) assert.notEqual(unpublished.json().id, draft.json().id);
  else assert.equal(unpublished.statusCode, 404);
  const published = await app.inject({ method: 'POST', url: `/api/v1/manifesto/${draft.json().id}/publish`, headers: role('party_lead'), payload: { confirmation: true } });
  assert.equal(published.statusCode, 200, published.body);
  const publicManifesto = await app.inject({ method: 'GET', url: '/api/v1/public/manifestos/ward-12-id' });
  assert.equal(publicManifesto.statusCode, 200, publicManifesto.body);
  assert.equal(publicManifesto.json().is_published, true);
  assert.ok(publicManifesto.json().promises.length > 0);
});

test('Open311 exposes routed services and creates privacy-safe TGIM requests', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const services = await app.inject({ method: 'GET', url: '/open311/v2/services.json' });
  assert.equal(services.statusCode, 200);
  assert.ok(services.json().some(service => service.service_code === 'WATER-SUPPLY'));
  const created = await app.inject({ method: 'POST', url: '/open311/v2/requests.json', headers: role('citizen'), payload: { service_code: 'WATER-SUPPLY', description: 'Persistent waterlogging blocks the school entrance after rainfall.', lat: 19.076, long: 72.8777, attribute: { idempotency_key: `open311-test-${crypto.randomUUID()}` } } });
  assert.equal(created.statusCode, 201, created.body);
  const requestId = created.json()[0].service_request_id;
  const status = await app.inject({ method: 'GET', url: `/open311/v2/requests/${requestId}.json` });
  assert.equal(status.statusCode, 200, status.body);
  assert.equal(status.json()[0].service_request_id, requestId);
  assert.equal('exact_latitude' in status.json()[0], false);
  const record = await app.inject({ method: 'GET', url: `/api/v1/issues/${requestId}/accountability` });
  assert.equal(record.statusCode, 200);
  assert.equal(record.json().official_cases[0].provider, 'tgim-open311');
  assert.equal('reporter_id' in record.json().issue, false);
});

test('official grievance status is auditable and cannot overwrite independent TGIM status', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const issueId = 'ae1bcf20-1a42-4912-8824-c10df8a8470a';
  const externalId = `MCGM-${crypto.randomUUID()}`;
  const linked = await app.inject({ method: 'POST', url: `/api/v1/issues/${issueId}/external-cases`, headers: role('department_officer'), payload: { authority_id: '20000000-0000-4000-8000-000000000002', provider: 'municipal-portal', external_id: externalId, service_code: 'WATER-SUPPLY', status: 'acknowledged', status_notes: 'Accepted by the municipal grievance desk.' } });
  assert.equal(linked.statusCode, 201, linked.body);
  const forbidden = await app.inject({ method: 'PATCH', url: `/api/v1/external-cases/${linked.json().id}`, headers: role('citizen'), payload: { status: 'closed', closed_at: new Date().toISOString() } });
  assert.equal(forbidden.statusCode, 403);
  const closed = await app.inject({ method: 'PATCH', url: `/api/v1/external-cases/${linked.json().id}`, headers: role('department_officer'), payload: { status: 'closed', status_notes: 'Agency marked its grievance complete.', closed_at: new Date().toISOString() } });
  assert.equal(closed.statusCode, 200, closed.body);
  const record = await app.inject({ method: 'GET', url: `/api/v1/issues/${issueId}/accountability` });
  assert.equal(record.json().official_status_summary.closed >= 1, true);
  assert.equal(record.json().independent_status, 'clustered');
  const audit = await app.inject({ method: 'GET', url: '/api/v1/audit', headers: role('platform_admin') });
  assert.ok(audit.json().some(event => event.event_type === 'external_case.status_update' && event.target_id === linked.json().id));
});

test('promise accountability combines milestones, evidence, citizen verdicts, documents, and appeals', async t => {
  const app = buildApp(); t.after(() => app.close());
  const promiseId = '30000000-0000-4000-8000-000000000003';
  const record = await app.inject({ method: 'GET', url: `/api/v1/public/promises/${promiseId}/accountability` });
  assert.equal(record.statusCode, 200, record.body);
  assert.equal(record.json().milestones.length, 5);
  assert.equal(record.json().outcome.score > 0, true);
  assert.equal(record.json().official_cases[0].external_id, 'MCGM/RN/2026/0145678');
  const verdict = await app.inject({ method: 'PUT', url: `/api/v1/party/promises/${promiseId}/verdict`, headers: role('citizen'), payload: { verdict: 'delivered' } });
  assert.equal(verdict.statusCode, 200, verdict.body);
  const milestone = await app.inject({ method: 'PATCH', url: '/api/v1/promise-milestones/40000000-0000-4000-8000-000000000004', headers: role('department_officer'), payload: { status: 'completed', completed_at: new Date().toISOString(), evidence_url: 'https://example.org/evidence/work-complete' } });
  assert.equal(milestone.statusCode, 200, milestone.body);
  const selfVerify = await app.inject({ method: 'PATCH', url: '/api/v1/promise-milestones/40000000-0000-4000-8000-000000000005', headers: role('department_officer'), payload: { status: 'verified', completed_at: new Date().toISOString(), evidence_url: 'https://example.org/evidence/officer-claim' } });
  assert.equal(selfVerify.statusCode, 403);
  const independentVerify = await app.inject({ method: 'PATCH', url: '/api/v1/promise-milestones/40000000-0000-4000-8000-000000000005', headers: role('volunteer'), payload: { status: 'verified', completed_at: new Date().toISOString(), evidence_url: 'https://example.org/evidence/volunteer-verification' } });
  assert.equal(independentVerify.statusCode, 200, independentVerify.body);
  const caseId = '60000000-0000-4000-8000-000000000001';
  const document = await app.inject({ method: 'POST', url: `/api/v1/external-cases/${caseId}/documents`, headers: role('department_officer'), payload: { title: 'Public work order', document_url: 'https://example.org/work-order.pdf', media_type: 'application/pdf', is_public: true } });
  assert.equal(document.statusCode, 201, document.body);
  const appeal = await app.inject({ method: 'POST', url: `/api/v1/external-cases/${caseId}/appeals`, headers: role('citizen'), payload: { reason: 'The official update does not match the waterlogging still visible at the school entrance.', evidence_url: 'https://example.org/appeal-evidence' } });
  assert.equal(appeal.statusCode, 201, appeal.body);
  const docs = await app.inject({ method: 'GET', url: `/api/v1/external-cases/${caseId}/documents` });
  assert.ok(docs.json().some(item => item.title === 'Public work order'));
});

test('coordinate-aware routing returns every eligible authority and an unconfigured authority does not fake a live submission', async t => {
  const app = buildApp(); t.after(() => app.close());
  const routes = await app.inject({ method: 'GET', url: '/api/v1/authorities/route?category=water&latitude=19.076&longitude=72.8777' });
  assert.equal(routes.statusCode, 200);
  assert.ok(routes.json().some(item => item.service_code === 'WATER-SUPPLY'));
  const consent = await app.inject({ method: 'POST', url: '/api/v1/issues/ae1bcf20-1a42-4912-8824-c10df8a8470a/sharing-consents', headers: role('citizen'), payload: { authority_id: '20000000-0000-4000-8000-000000000002', purpose: 'external_case_submission' } });
  assert.equal(consent.statusCode, 201, consent.body);
  const queued = await app.inject({ method: 'POST', url: '/api/v1/issues/ae1bcf20-1a42-4912-8824-c10df8a8470a/submit-to-authority', headers: role('department_officer'), payload: { authority_id: '20000000-0000-4000-8000-000000000002' } });
  assert.equal(queued.statusCode, 202, queued.body);
  const outbox = await app.inject({ method: 'GET', url: '/api/v1/operations/outbox', headers: role('platform_admin') });
  assert.ok(outbox.json().some(event => event.id === queued.json().id && event.event_type === 'external_case.submit' && event.status === 'pending'));
});

test('M1 projection contract removes hidden records and immutable publication metadata from public reads', async t => {
  const app = buildApp(); t.after(() => app.close());
  const issueId = 'ae1bcf20-1a42-4912-8824-c10df8a8470a';
  const hidden = await app.inject({ method: 'POST', url: '/api/v1/moderation/actions', headers: role('platform_moderator'), payload: { target_table: 'issues', target_id: issueId, action: 'hide', reason: 'Personal information requires review before publication.' } });
  assert.equal(hidden.statusCode, 201, hidden.body);
  assert.equal((await app.inject({ method: 'GET', url: `/api/v1/issues/${issueId}` })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/issues' })).json().some(issue => issue.id === issueId), false);
  const restored = await app.inject({ method: 'POST', url: '/api/v1/moderation/actions', headers: role('platform_moderator'), payload: { target_table: 'issues', target_id: issueId, action: 'restore', reason: 'The identifying detail was removed during moderation review.' } });
  assert.equal(restored.statusCode, 201, restored.body);
  const publicIssue = (await app.inject({ method: 'GET', url: `/api/v1/issues/${issueId}` })).json();
  assert.equal('reporter_id' in publicIssue, false);
  assert.equal('exact_latitude' in publicIssue, false);
  assert.equal('idempotency_key' in publicIssue, false);
  const manifesto = (await app.inject({ method: 'GET', url: '/api/v1/public/manifestos/ward-12-id' })).json();
  assert.equal('published_by' in manifesto, false);
  assert.ok(manifesto.published_at);
});

test('M2 grant revocation blocks an otherwise valid party actor', async t => {
  const app = buildApp(); t.after(() => app.close());
  const grants = await app.inject({ method: 'GET', url: '/api/v1/scope-grants/mine', headers: role('party_lead') });
  assert.equal(grants.statusCode, 200, grants.body);
  const grant = grants.json().find(item => item.capabilities.includes('manifesto.generate'));
  assert.ok(grant);
  const revoked = await app.inject({ method: 'POST', url: `/api/v1/scope-grants/${grant.id}/revoke`, headers: { 'x-tgim-demo-role': 'platform_admin' } });
  assert.equal(revoked.statusCode, 200, revoked.body);
  const denied = await app.inject({ method: 'POST', url: '/api/v1/manifesto/generate', headers: role('party_lead'), payload: { areaId: 'ward-12-id' } });
  assert.equal(denied.statusCode, 403, denied.body);
});

test('versioned forms accept idempotent responses and reject unknown answers', async t => {
  const app = buildApp(); t.after(() => app.close());
  const slug = `pilot-form-${Date.now()}`;
  const created = await app.inject({
    method: 'POST', url: '/api/v1/forms', headers: role('platform_admin'),
    payload: { slug, title: 'Pilot civic response', questions: [{ key: 'summary', label: 'What happened?', type: 'long_text', required: true, position: 0 }] },
  });
  assert.equal(created.statusCode, 201, created.body);
  const published = await app.inject({ method: 'POST', url: `/api/v1/forms/${slug}/publish`, headers: { 'x-tgim-demo-role': 'platform_admin' } });
  assert.equal(published.statusCode, 200, published.body);
  const idempotencyKey = '11111111-1111-4111-8111-111111111111';
  const first = await app.inject({ method: 'POST', url: `/api/v1/forms/${slug}/responses`, headers: role('citizen'), payload: { idempotency_key: idempotencyKey, area_id: 'ward-12-id', answers: { summary: 'Drainage water blocks the school entrance after heavy rain.' } } });
  assert.equal(first.statusCode, 201, first.body);
  const replay = await app.inject({ method: 'POST', url: `/api/v1/forms/${slug}/responses`, headers: role('citizen'), payload: { idempotency_key: idempotencyKey, area_id: 'ward-12-id', answers: { summary: 'Drainage water blocks the school entrance after heavy rain.' } } });
  assert.equal(replay.statusCode, 201, replay.body);
  assert.equal(replay.json().id, first.json().id);
  const invalid = await app.inject({ method: 'POST', url: `/api/v1/forms/${slug}/responses`, headers: role('citizen'), payload: { idempotency_key: '22222222-2222-4222-8222-222222222222', answers: { unknown: 'private field injection' } } });
  assert.equal(invalid.statusCode, 422, invalid.body);
});

test('area-bound polls accept one idempotent vote and suppress small results', async t => {
  const app = buildApp(); t.after(() => app.close());
  const created = await app.inject({
    method: 'POST', url: '/api/v1/polls', headers: role('platform_admin'),
    payload: { area_id: 'ward-12-id', question: 'Which drainage fix should be reviewed first?', type: 'single_choice', starts_at: new Date(Date.now() - 60_000).toISOString(), ends_at: new Date(Date.now() + 3_600_000).toISOString(), options: [{ label: 'Clear the inlet', value: 'clear-inlet' }, { label: 'Regrade the path', value: 'regrade-path' }] },
  });
  assert.equal(created.statusCode, 201, created.body);
  const published = await app.inject({ method: 'POST', url: `/api/v1/polls/${created.json().id}/publish`, headers: { 'x-tgim-demo-role': 'platform_admin' } });
  assert.equal(published.statusCode, 200, published.body);
  const optionId = published.json().options[0].id;
  const idempotencyKey = '33333333-3333-4333-8333-333333333333';
  const vote = await app.inject({ method: 'POST', url: `/api/v1/polls/${created.json().id}/votes`, headers: role('citizen'), payload: { idempotency_key: idempotencyKey, option_id: optionId } });
  assert.equal(vote.statusCode, 201, vote.body);
  const replay = await app.inject({ method: 'POST', url: `/api/v1/polls/${created.json().id}/votes`, headers: role('citizen'), payload: { idempotency_key: idempotencyKey, option_id: optionId } });
  assert.equal(replay.statusCode, 201, replay.body);
  assert.equal(replay.json().receipt_id, vote.json().receipt_id);
  const result = await app.inject({ method: 'GET', url: `/api/v1/polls/${created.json().id}/results` });
  assert.equal(result.statusCode, 200, result.body);
  assert.equal(result.json().suppressed, true);
  assert.equal(result.json().counts.length, 0);
});
