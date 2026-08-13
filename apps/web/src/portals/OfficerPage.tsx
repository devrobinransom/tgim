'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, UploadCloud } from 'lucide-react';
import type { PromiseStatus } from '@tgim/shared';
import type { PromiseAccountabilityRecord } from '@tgim/shared';
import { publicTimeline, statusCounts } from '../lib/demoData';
import { useAsyncAction, useDashboardData } from '../lib/useDashboardData';
import {
  ActionBar,
  Button,
  EmptyState,
  MetricCard,
  MiniBar,
  PageHeader,
  Panel,
  Select,
  StatusChip,
  Timeline,
} from '../ui/primitives';

export function OfficerPage() {
  const { api, promises, issueDetail, authorities, refresh } = useDashboardData();
  const { busy, message, run } = useAsyncAction(refresh);
  const [status, setStatus] = useState<PromiseStatus>('on_track');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [officialReference, setOfficialReference] = useState('');
  const [accountability, setAccountability] = useState<PromiseAccountabilityRecord | null>(null);
  const [documentUrl, setDocumentUrl] = useState('https://example.org/work-order.pdf');
  const routedAuthority = authorities.find(item => item.category === issueDetail?.category) || authorities[0];
  const activeMilestone = accountability?.milestones.find(item => ['pending', 'in_progress'].includes(item.status));
  const officerCanCompleteMilestone = activeMilestone && !activeMilestone.title.toLowerCase().includes('citizen verified');
  const officialCase = issueDetail?.official_cases[0];

  useEffect(() => {
    const promiseId = promises[0]?.id; if (!promiseId) return;
    let active = true; void api.party.accountability(promiseId).then(value => { if (active) setAccountability(value); });
    return () => { active = false; };
  }, [api, promises]);
  const counts = statusCounts(promises);

  const update = () => {
    const promise = promises[0];
    if (!promise) return;
    return run(
      () =>
        api.tracker.addUpdate({
          party_promise_id: promise.id,
          status,
          update_text: 'Department review completed; work package is being tracked publicly.',
          evidence_url: evidenceUrl || undefined,
        }),
      'Delivery update published.',
    );
  };

  const attachEvidence = async (file?: File) => {
    if (!file) return;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.readAsDataURL(file);
    });
    await run(async () => {
      const uploaded = await api.media.upload({ media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4', filename: file.name, base64: data });
      setEvidenceUrl(uploaded.media_url);
      return uploaded;
    }, 'Evidence processed and attached.');
  };

  const linkOfficialCase = () => {
    if (!issueDetail || !routedAuthority || !officialReference.trim()) return;
    return run(() => api.issues.linkExternalCase(issueDetail.id, { authority_id: routedAuthority.id, provider: 'municipal-portal', external_id: officialReference.trim(), service_code: routedAuthority.service_code, status: 'acknowledged', status_notes: 'Official reference linked by the assigned department officer.' }), 'Official grievance reference linked without changing TGIM verification status.');
  };
  const submitOfficially = () => issueDetail && routedAuthority && run(() => api.issues.submitToAuthority(issueDetail.id, { authority_id: routedAuthority.id }), 'Submission queued; TGIM will poll the official system automatically.');
  const completeMilestone = () => activeMilestone && run(async () => { await api.party.updateMilestone(activeMilestone.id, { status: 'completed', completed_at: new Date().toISOString(), evidence_url: evidenceUrl || 'https://example.org/evidence/department-update' }); if (promises[0]) setAccountability(await api.party.accountability(promises[0].id)); }, 'Milestone completed with public evidence.');
  const addOfficialDocument = () => officialCase && run(() => api.externalCases.addDocument(officialCase.id, { title: 'Department work order', document_url: documentUrl, media_type: 'application/pdf', is_public: true }), 'Official document added to the public record.');

  return (
    <div className="page-stack">
      <PageHeader
        title="Officer delivery updates"
        description="Keep adopted promises useful by publishing dated status, evidence, and progress notes."
        eyebrow={<><Activity size={16} /> Delivery monitoring</>}
        actions={
          <Select value={status} onChange={(event) => setStatus(event.target.value as PromiseStatus)}>
            <option value="on_track">On track</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="disputed">Disputed</option>
          </Select>
        }
      />

      <section className="metric-grid">
        <MetricCard label="Tracked" value={String(promises.length)} detail="adopted commitments" />
        <MetricCard label="On track" value={String(counts.on_track)} tone="good" detail="active updates" />
        <MetricCard label="Delayed" value={String(counts.delayed)} tone="warn" detail="needs explanation" />
        <MetricCard label="Disputed" value={String(counts.disputed)} tone="danger" detail="public challenge" />
      </section>

      <section className="workspace-grid">
        <Panel className="span-2" title="Adopted promise queue" description="Officer actions attach status to commitments already visible to residents.">
          {promises.length === 0 && <EmptyState title="No adopted promises" copy="The officer workflow unlocks after party adoption." />}
          {promises.map((promise) => (
            <article className="queue-row" key={promise.id}>
              <Activity size={20} />
              <div>
                <strong>{promise.adopted_title}</strong>
                <p>{promise.adopted_description}</p>
                <span>Target: {promise.target_metric} / timeline {new Date(promise.timeline).toLocaleDateString()}</span>
              </div>
              <StatusChip status={promise.status} />
            </article>
          ))}
          <ActionBar>
            <Button variant="primary" onClick={update} disabled={busy || promises.length === 0}>
              <UploadCloud size={16} /> Publish update
            </Button>
            <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,video/mp4" onChange={(event) => void attachEvidence(event.target.files?.[0])} />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>Attach evidence</Button>
          </ActionBar>
          {evidenceUrl && <p className="action-message">Evidence ready: <a href={evidenceUrl} target="_blank" rel="noreferrer">review processed file</a></p>}
          {message && <p className="action-message">{message}</p>}
        </Panel>

        <Panel title="Delivery timeline" description="Dates remain visible without hover.">
          <Timeline items={publicTimeline} />
        </Panel>

        <Panel title="Status distribution" description="Compact chart for operations review.">
          <MiniBar label="on track" value={promises.length ? Math.round((counts.on_track / promises.length) * 100) : 0} tone="good" />
          <MiniBar label="delayed" value={promises.length ? Math.round((counts.delayed / promises.length) * 100) : 0} tone="warn" />
          <MiniBar label="completed" value={promises.length ? Math.round((counts.completed / promises.length) * 100) : 0} tone="good" />
          <MiniBar label="disputed" value={promises.length ? Math.round((counts.disputed / promises.length) * 100) : 0} tone="danger" />
        </Panel>

        <Panel title="Official grievance link" description="Agency case state remains separate from independent TGIM verification.">
          <p className="supporting-copy">{routedAuthority ? `${routedAuthority.name} / ${routedAuthority.service_name}` : 'No authority route is configured for this issue category.'}</p>
          <label className="field-label">Official reference ID<input value={officialReference} onChange={event => setOfficialReference(event.target.value)} placeholder="Municipal grievance number" /></label>
          <Button variant="primary" disabled={busy || !issueDetail || !routedAuthority || !officialReference.trim()} onClick={linkOfficialCase}>Link official case</Button>
          <Button variant="secondary" disabled={busy || !issueDetail || !routedAuthority} onClick={submitOfficially}>Submit through Open311</Button>
          {issueDetail?.official_cases.map(item => <article className="compact-row" key={item.id}><div><strong>{item.authority_name}</strong><span>{item.external_id}</span></div><StatusChip status={item.status} /></article>)}
        </Panel>

        <Panel title="Promise delivery proof" description="Complete milestones only with a public evidence reference.">
          {activeMilestone ? <><p className="supporting-copy">Next milestone: <strong>{activeMilestone.title}</strong></p>{officerCanCompleteMilestone ? <Button variant="primary" disabled={busy} onClick={completeMilestone}>Complete milestone with evidence</Button> : <p className="supporting-copy">Awaiting an independent volunteer or moderator verdict. Delivery owners cannot verify their own work.</p>}</> : <p className="supporting-copy">All configured milestones are complete.</p>}
          {officialCase ? <><label className="field-label">Official document URL<input type="url" value={documentUrl} onChange={event => setDocumentUrl(event.target.value)} /></label><Button variant="secondary" disabled={busy || !documentUrl} onClick={addOfficialDocument}>Publish official document</Button></> : null}
        </Panel>
      </section>
    </div>
  );
}
