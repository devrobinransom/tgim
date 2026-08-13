'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, CheckCircle2, Clock3, ExternalLink, FileText, HelpCircle, Landmark, MapPin, Minus, Scale, Share2, ShieldCheck, ThumbsDown, ThumbsUp, UserRoundCheck } from 'lucide-react';
import type { AreaDashboardSummary, CitizenVerdictValue, ExternalCaseDocument, ManifestoPromise, PromiseAccountabilityRecord, PromiseMilestone, PublicClusterDetail, PublicIssue } from '@tgim/shared';
import type { ManifestoDetail } from '@tgim/api-client';
import { useAsyncAction, usePortalApi } from '../lib/useDashboardData';
import { Button, CategoryBadge, EmptyState, MetricCard, Panel } from '../ui/primitives';
import { GeoMap } from '../ui/GeoMap';

const verdictOptions: Array<{ value: CitizenVerdictValue; label: string; icon: typeof ThumbsUp }> = [
  { value: 'delivered', label: 'Delivered', icon: ThumbsUp },
  { value: 'partly_delivered', label: 'Partly delivered', icon: Minus },
  { value: 'not_delivered', label: 'Not delivered', icon: ThumbsDown },
  { value: 'not_sure', label: 'Not sure', icon: HelpCircle },
];

function milestoneDate(item: PromiseMilestone) {
  if (item.completed_at) return new Date(item.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (item.due_at) return `Due ${new Date(item.due_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  return item.status === 'in_progress' ? 'In progress' : 'Pending';
}

function LoadError({ message }: { message: string }) {
  return <main className="ledger-empty"><ShieldCheck size={30} /><h1>Public record unavailable</h1><p>{message}</p></main>;
}

function PublicAreaPage({ areaId }: { areaId: string }) {
  const api = usePortalApi();
  const [summary, setSummary] = useState<AreaDashboardSummary | null>(null);
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [manifesto, setManifesto] = useState<ManifestoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.aggregates.area(areaId),
      api.issues.list({ areaId }),
      api.manifesto.publicGet(areaId).catch(() => null),
    ]).then(([nextSummary, nextIssues, nextManifesto]) => {
      if (!active) return;
      setSummary(nextSummary); setIssues(nextIssues); setManifesto(nextManifesto);
    }).catch(() => { if (active) setError('This area record could not be loaded right now.'); });
    return () => { active = false; };
  }, [api, areaId]);

  if (error) return <LoadError message={error} />;
  if (!summary) return <main className="ledger-empty"><Clock3 size={30} /><h1>Loading public area record</h1><p>Fetching privacy-safe issue and promise evidence.</p></main>;

  return <main className="page-stack public-record">
    <header className="page-header">
      <div><div className="meta-line"><ShieldCheck size={16} /> Public, privacy-safe area record</div><h1>Area accountability record</h1><p>Demand, verification, promises, and delivery evidence for this area. Exact reporter locations and identities are not shown.</p></div>
      <div className="header-actions"><Link className="button secondary" href={`/public/manifestos/${areaId}`}>Read manifesto</Link></div>
    </header>
    <section className="metric-grid">
      <MetricCard label="Reports" value={String(summary.report_count)} detail="privacy-safe public records" />
      <MetricCard label="Verified clusters" value={String(summary.verified_cluster_count)} tone="good" detail="ready for public demand review" />
      <MetricCard label="Adopted promises" value={String(summary.adopted_promise_count)} tone="info" detail="trackable commitments" />
      <MetricCard label="Completed" value={String(summary.completed_promise_count)} tone="good" detail="reported delivery status" />
    </section>
    <section className="workspace-grid">
      <Panel className="map-panel-wide" title="Where reports are clustering" description="Explore the public-safe pattern. Select a point for its evidence record; precise reporter locations never reach the map.">
        <GeoMap issues={issues} label="Public issue pattern for this area" />
      </Panel>
      <Panel title="Local issue evidence" description="Each link opens a source record using blurred or public-safe location only.">
        {issues.length === 0 ? <EmptyState title="No public reports yet" copy="Reports will appear here after a citizen submits a local issue." /> : issues.map(issue => <article className="queue-row" key={issue.id}><MapPin size={20} /><div><strong>{issue.description}</strong><p><CategoryBadge category={issue.category} /> {issue.severity} severity · {issue.status}</p><span>{issue.cluster_id ? <Link href={`/public/clusters/${issue.cluster_id}`}>Open cluster evidence</Link> : 'Awaiting cluster review'}</span></div></article>)}
      </Panel>
      <Panel title="Area evidence summary" description="Counts describe the visible public record, not individual residents."><p className="supporting-copy">{Object.entries(summary.category_mix).map(([category, count]) => `${category}: ${count}`).join(' · ') || 'No category data yet.'}</p>{manifesto ? <><strong>Manifesto version {manifesto.version}</strong><p>{manifesto.promises.length} evidence-linked promises are available.</p><Link className="button secondary" href={`/public/manifestos/${areaId}`}>Read published promises</Link></> : <EmptyState title="No published manifesto" copy="A party may draft commitments, but they appear here only after explicit publication." />}</Panel>
    </section>
  </main>;
}

function PublicClusterPage({ clusterId }: { clusterId: string }) {
  const api = usePortalApi();
  const [record, setRecord] = useState<PublicClusterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void api.clusters.publicGet(clusterId).then(value => { if (active) setRecord(value); }).catch(() => { if (active) setError('This cluster is not publicly available.'); });
    return () => { active = false; };
  }, [api, clusterId]);
  if (error) return <LoadError message={error} />;
  if (!record) return <main className="ledger-empty"><Clock3 size={30} /><h1>Loading cluster evidence</h1><p>Fetching the public-safe source record.</p></main>;

  return <main className="page-stack public-record">
    <header className="page-header"><div><div className="meta-line"><ShieldCheck size={16} /> Evidence cluster</div><h1>{record.cluster.title}</h1><p>{record.cluster.summary || 'Citizen reports grouped for independent verification.'}</p></div><div className="header-actions"><Link className="button secondary" href={`/public/area/${record.cluster.area_id}`}>View area record</Link></div></header>
    <section className="metric-grid"><MetricCard label="Source reports" value={String(record.report_count)} detail="reporter identities withheld" /><MetricCard label="Support" value={String(record.support_count)} tone="info" detail="resident support count" /><MetricCard label="Priority" value={String(record.cluster.priority_score)} tone="warn" detail="public triage score" /><MetricCard label="Verification" value={record.cluster.status.replace('_', ' ')} tone={record.cluster.status === 'verified' ? 'good' : 'neutral'} detail="independent cluster status" /></section>
    <section className="workspace-grid"><Panel className="map-panel-wide" title="Public-safe cluster geography" description="Points show generalized public locations; select one to read its source summary."><GeoMap issues={record.issues} label={`Public geography for ${record.cluster.title}`} /></Panel><Panel title="Source reports" description="Summaries and public-safe locations only.">{record.issues.map(issue => <article className="queue-row" key={issue.id}><FileText size={20} /><div><strong>{issue.description}</strong><p><CategoryBadge category={issue.category} /> {issue.severity} severity · {issue.privacy} location</p></div></article>)}</Panel><Panel title="Verification history" description="Outcomes are visible; volunteer identities stay private."><p className="supporting-copy">Severity mix: {Object.entries(record.severity_mix).map(([severity, count]) => `${severity} ${count}`).join(' · ') || 'No reports yet.'}</p>{record.verifications.length ? record.verifications.map(event => <article className="compact-row" key={event.id}><div><strong>{event.outcome.replace('_', ' ')}</strong><span>{event.notes || 'Structured checklist submitted.'}</span></div><span>{new Date(event.created_at).toLocaleDateString('en-IN')}</span></article>) : <EmptyState title="Awaiting verification" copy="A trusted volunteer can review this evidence without seeing reporter identity." />}</Panel></section>
  </main>;
}

function PublicManifestoPage({ areaId }: { areaId: string }) {
  const api = usePortalApi();
  const [manifesto, setManifesto] = useState<ManifestoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void api.manifesto.publicGet(areaId).then(value => { if (active) setManifesto(value); }).catch(() => { if (active) setError('There is no human-approved manifesto for this area yet.'); }); return () => { active = false; }; }, [api, areaId]);
  if (error) return <LoadError message={error} />;
  if (!manifesto) return <main className="ledger-empty"><Clock3 size={30} /><h1>Loading published manifesto</h1><p>Checking the human-approved public record.</p></main>;
  return <main className="page-stack public-record"><header className="page-header"><div><div className="meta-line"><ShieldCheck size={16} /> Published manifesto · version {manifesto.version}</div><h1>People's manifesto</h1><p>Each promise keeps a direct link to its verified source cluster. This is a publication record, not an automatic AI release.</p></div><div className="header-actions"><Link className="button secondary" href={`/public/area/${areaId}`}>View area record</Link></div></header><section className="workspace-grid">{manifesto.promises.map((promise: ManifestoPromise) => <Panel key={promise.id} title={promise.title} description={promise.description}><p><strong>Target:</strong> {promise.target_metric || 'Metric pending'}</p><p><strong>Horizon:</strong> {promise.time_horizon}</p>{promise.cluster_id ? <Link href={`/public/clusters/${promise.cluster_id}`}>View source cluster evidence</Link> : <p>Source cluster reference unavailable.</p>}</Panel>)}</section></main>;
}

function PublicPromisePage({ promiseId }: { promiseId: string }) {
  const api = usePortalApi();
  const [record, setRecord] = useState<PromiseAccountabilityRecord | null>(null);
  const [verdictMessage, setVerdictMessage] = useState('');
  const [documents, setDocuments] = useState<ExternalCaseDocument[]>([]);
  const [renderedAt] = useState(() => Date.now());
  const [reason, setReason] = useState('The published status does not match the evidence visible at the project site.');
  const [evidenceUrl, setEvidenceUrl] = useState('https://example.org/civic-evidence');
  const { busy, message, run } = useAsyncAction();
  const officialCaseId = record?.official_cases[0]?.id;
  useEffect(() => { let active = true; void api.party.accountability(promiseId).then(value => { if (active) setRecord(value); }).catch(() => { if (active) setRecord(null); }); return () => { active = false; }; }, [api, promiseId]);
  useEffect(() => { if (!officialCaseId) return; let active = true; void api.externalCases.documents(officialCaseId).then(value => { if (active) setDocuments(value); }); return () => { active = false; }; }, [api, officialCaseId]);
  const refreshRecord = async () => setRecord(await api.party.accountability(promiseId));
  const submitVerdict = async (verdict: CitizenVerdictValue) => { await api.party.verdict(promiseId, { verdict }); await refreshRecord(); setVerdictMessage('Your private verdict is now part of the aggregate public score.'); };
  const challenge = () => run(() => api.disputes.create({ party_promise_id: promiseId, reason, evidence_url: evidenceUrl }), 'Challenge submitted for moderator review.');
  const share = async () => navigator.share ? navigator.share({ title: record?.promise.adopted_title || 'TGIM public promise', url: window.location.href }) : navigator.clipboard.writeText(window.location.href);
  if (!record) return <LoadError message="No public promise record is available at this link." />;
  const { promise, milestones, delivery_updates, official_cases, outcome } = record;
  const latestUpdate = delivery_updates[0]; const officialCase = official_cases[0];
  const appealOfficialCase = () => officialCase && run(async () => { await api.externalCases.appeal(officialCase.id, { reason, evidence_url: evidenceUrl }); await refreshRecord(); }, 'Official case appealed; TGIM independent review remains open.');
  return <main className="promise-ledger"><header className="ledger-topline"><div><MapPin size={18} /> Mumbai Suburban public record</div><div>Updated {new Date(outcome.calculated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}<Button variant="secondary" onClick={() => void share()}><Share2 size={16} /> Share</Button></div></header><section className="ledger-hero"><div><h1>{promise.adopted_title}</h1><p>{promise.adopted_description}</p></div><div className="ledger-seal" aria-label="TGIM public ledger, evidence linked"><span>TGIM</span>PUBLIC LEDGER</div></section><section className="ledger-facts" aria-label="Promise facts"><div><FileText /><span><small>Source evidence</small><strong>{record.source_cluster_ids.length} verified cluster</strong><em>{outcome.evidence_strength}% milestone evidence</em></span></div><div><UserRoundCheck /><span><small>Responsible owner</small><strong>{promise.owner_department || 'Owner not assigned'}</strong><em>{promise.estimated_cost || 'Public cost estimate pending'}</em></span></div><div><CalendarDays /><span><small>Deadline</small><strong>{new Date(promise.timeline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong><em>{new Date(promise.timeline).getTime() >= renderedAt ? `${Math.ceil((new Date(promise.timeline).getTime() - renderedAt) / 86400000)} days remaining` : 'Deadline passed'}</em></span></div></section><section className="delivery-rail" aria-labelledby="promise-to-proof"><h2 id="promise-to-proof">Promise to proof</h2><ol>{milestones.map((item, index) => <li key={item.id} className={`milestone milestone-${item.status}`}><div className="milestone-node">{['completed', 'verified'].includes(item.status) ? <Check /> : item.status === 'in_progress' ? <Clock3 /> : <span>{index + 1}</span>}</div><strong>{index + 1}. {item.title}</strong><span>{milestoneDate(item)}</span></li>)}</ol></section><section className="ledger-outcome"><div className="outcome-score"><div><h2>Independent verdict</h2><span className="score-number">{outcome.score}%</span><strong>{outcome.label.replace('_', ' ')}</strong></div><p>Weighted from milestone progress, public evidence, timeliness, and aggregated citizen verdicts—not the agency’s closure status.</p><div className="score-factors"><span>Milestones <b>{outcome.milestone_progress}%</b></span><span>Evidence <b>{outcome.evidence_strength}%</b></span><span>Timeliness <b>{outcome.timeliness}%</b></span><span>Citizen confidence <b>{outcome.citizen_confidence}%</b></span></div></div><div className="latest-evidence"><h2>Latest evidence update</h2>{latestUpdate ? <><div className="evidence-title"><CheckCircle2 /><div><strong>{latestUpdate.update_text}</strong><span>{new Date(latestUpdate.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div></div>{latestUpdate.evidence_url ? <a href={latestUpdate.evidence_url} target="_blank" rel="noreferrer">View published evidence <ExternalLink size={14} /></a> : null}</> : <p>No delivery evidence has been published.</p>}<Button variant="secondary" onClick={() => document.getElementById('challenge')?.scrollIntoView({ behavior: 'smooth' })}>Challenge this update</Button></div></section><section className="ledger-verification"><div className="official-case"><h2>Official case <small>separate channel</small></h2>{officialCase ? <><div className="official-reference"><Landmark /><div><span>{officialCase.authority_name}</span><strong>{officialCase.external_id}</strong><em>{officialCase.status_notes}</em></div><b>{officialCase.status.replace('_', ' ')}</b></div>{officialCase.public_url ? <a href={officialCase.public_url} target="_blank" rel="noreferrer">View on official portal <ExternalLink size={14} /></a> : null}{documents.map(document => <a key={document.id} href={document.document_url} target="_blank" rel="noreferrer">{document.title} <ExternalLink size={14} /></a>)}</> : <p>No official grievance reference is linked.</p>}</div><div className="citizen-verdict"><h2>Citizen verdict</h2><p>Your identity stays private. The result is aggregated and independent of officials.</p><div className="verdict-options">{verdictOptions.map(option => <button key={option.value} onClick={() => void submitVerdict(option.value)}><option.icon /><span>{option.label}</span><b>{outcome.verdict_counts[option.value]}</b></button>)}</div>{verdictMessage ? <p className="ledger-success">{verdictMessage}</p> : null}</div></section><section className="ledger-challenge" id="challenge"><div><Scale /><div><h2>Challenge this update</h2><p>Submit contrary evidence for an independent moderator review.</p></div></div><label>Reason<textarea value={reason} onChange={event => setReason(event.target.value)} /></label><label>Evidence URL<input type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} /></label><Button variant="primary" disabled={busy || reason.length < 20} onClick={challenge}>Submit challenge</Button>{officialCase ? <Button variant="secondary" disabled={busy || reason.length < 20} onClick={appealOfficialCase}>Appeal official case status</Button> : null}{message ? <p className="ledger-success">{message}</p> : null}</section><footer className="ledger-method"><ShieldCheck /><p><strong>Methodology and privacy</strong> TGIM scores only published, source-linked evidence. Exact citizen locations and identities are never shown publicly. Official closure is displayed but never treated as independent proof.</p></footer></main>;
}

export function PublicPage({ areaId, clusterId, promiseId, manifestoAreaId }: { areaId?: string; clusterId?: string; promiseId?: string; manifestoAreaId?: string }) {
  if (promiseId) return <PublicPromisePage promiseId={promiseId} />;
  if (clusterId) return <PublicClusterPage clusterId={clusterId} />;
  if (manifestoAreaId) return <PublicManifestoPage areaId={manifestoAreaId} />;
  if (areaId) return <PublicAreaPage areaId={areaId} />;
  return <LoadError message="This public record link is incomplete." />;
}
