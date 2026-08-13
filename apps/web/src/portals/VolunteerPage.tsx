'use client';

import { ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { DEMO_CLUSTER_ID } from '../lib/portal';
import { evidenceItems, issueTitle, priorityFromIssue } from '../lib/demoData';
import { useAsyncAction, useDashboardData } from '../lib/useDashboardData';
import {
  ActionBar,
  Button,
  CategoryBadge,
  DataTable,
  EvidenceRow,
  MetricCard,
  MiniBar,
  PageHeader,
  Panel,
} from '../ui/primitives';
import { GeoMap } from '../ui/GeoMap';

export function VolunteerPage() {
  const { api, issues, issueDetail, refresh } = useDashboardData();
  const { busy, message, run } = useAsyncAction(refresh);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIssue = issues.find(issue => issue.id === selectedId) || issues[0];

  const decide = (outcome: 'verified' | 'insufficient_evidence') =>
    run(
      () =>
        api.verification.submit({
          cluster_id: selectedIssue?.cluster_id || issueDetail?.cluster_id || DEMO_CLUSTER_ID,
          outcome,
          notes: outcome === 'verified' ? 'Verified from volunteer web portal.' : 'More field evidence is required before verification.',
          checklist: { location_matches: true, evidence_is_clear: true, duplicate_checked: true },
        }),
      outcome === 'verified' ? 'Cluster verified and ready for manifesto generation.' : 'Cluster marked as needing more evidence.',
    );

  return (
    <div className="page-stack">
      <PageHeader
        title="Volunteer field verification"
        description="Prioritize report clusters, confirm evidence quality, and produce a defensible audit trail."
        eyebrow={<><ShieldCheck size={16} /> Evidence review</>}
      />

      <section className="metric-grid">
        <MetricCard label="Queue" value={String(issues.length)} detail="open reports" />
        <MetricCard label="Checklist" value="3/3" tone="good" detail="required checks visible" />
        <MetricCard label="Top urgency" value={issues[0] ? String(priorityFromIssue(issues[0], 0)) : '0'} tone="warn" detail="ranked cluster score" />
        <MetricCard label="Privacy" value="Blurred" tone="info" detail="public coordinates only" />
      </section>

      <section className="workspace-grid">
        <Panel className="span-2" title="Verification queue" description="Ranked list optimized for repeated volunteer review.">
          <DataTable
            columns={['Report cluster', 'Category', 'Urgency', 'Status', 'Decision']}
            rows={issues.map((issue, index) => [
              <strong>{issueTitle(issue)}</strong>,
              <CategoryBadge category={issue.category} />,
              <MiniBar label="score" value={priorityFromIssue(issue, index)} tone={index === 0 ? 'warn' : 'neutral'} />,
              issue.status,
              <Button variant="ghost" onClick={() => { setSelectedId(issue.id); document.getElementById('selected-cluster')?.scrollIntoView({ behavior: 'smooth' }); }}>Review</Button>,
            ])}
          />
          <ActionBar>
            <Button variant="primary" onClick={() => decide('verified')} disabled={busy || !selectedIssue}><ClipboardCheck size={16} /> Verify selected cluster</Button>
            <Button variant="secondary" onClick={() => decide('insufficient_evidence')} disabled={busy || !selectedIssue}>Mark insufficient</Button>
          </ActionBar>
          {message && <p className="action-message">{message}</p>}
        </Panel>

        <Panel title="Cluster map" description="Public-safe area context for the selected queue row.">
          <GeoMap issues={issues} selectedIssueId={selectedIssue?.id} onSelectIssue={setSelectedId} label="Volunteer verification queue map" />
          <p className="supporting-copy">Exact reporter coordinates stay hidden; volunteers compare blurred radius, category pattern, and evidence clarity.</p>
        </Panel>

        <Panel title="Checklist" description="Every decision creates audit evidence.">
          {evidenceItems.map((item) => <EvidenceRow key={item.label} {...item} />)}
        </Panel>

        <div id="selected-cluster" className="span-2">
        <Panel title="Selected cluster evidence" description="Compact review detail for phones, field laptops, and admin audit.">
          {(selectedIssue ? [selectedIssue] : []).map((issue) => (
            <article className="queue-row" key={issue.id}>
              <ClipboardCheck size={20} />
              <div>
                <strong>{issue.description}</strong>
                <p>{issue.privacy} location / {issue.severity} severity / {issue.status}</p>
                <span>Cluster {issue.cluster_id || 'pending'} / created {new Date(issue.created_at).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </Panel>
        </div>
      </section>
    </div>
  );
}
