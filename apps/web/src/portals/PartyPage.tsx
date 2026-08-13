'use client';

import { FileText, GitCompareArrows, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AREA_ID } from '../lib/portal';
import { categoryMix, coverageRows, issueTitle, priorityFromIssue } from '../lib/demoData';
import { useAsyncAction, useDashboardData } from '../lib/useDashboardData';
import {
  ActionBar,
  Button,
  CategoryBadge,
  DataTable,
  EmptyState,
  FilterBar,
  MetricCard,
  MiniBar,
  PageHeader,
  Panel,
  StatusChip,
} from '../ui/primitives';
import { GeoMap } from '../ui/GeoMap';

export function PartyPage() {
  const { api, issues, manifesto, promises, refresh } = useDashboardData();
  const { busy, message, run } = useAsyncAction(refresh);
  const firstPromise = manifesto?.promises[0];
  const topIssue = issues[0];
  const [owner, setOwner] = useState('Municipal Roads Department');
  const [cost, setCost] = useState('Estimate pending departmental review');
  const [feasibility, setFeasibility] = useState('Subject to site survey, tender approval, and published milestone evidence.');
  const [showComparison, setShowComparison] = useState(false);
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() || '';
  const pathname = usePathname();
  const router = useRouter();
  const setParam = useCallback((key: string, value?: string) => {
    const next = new URLSearchParams(searchString);
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }, [pathname, router, searchString]);
  const categoryFilter = searchParams?.get('category') || '';
  const search = searchParams?.get('search') || '';
  const filteredIssues = issues.filter(issue => (!categoryFilter || issue.category === categoryFilter) && (!search || issue.description.toLowerCase().includes(search.toLowerCase())));

  const generate = () => run(() => api.manifesto.generate(AREA_ID), 'Manifesto draft generated from verified clusters.');
  const adopt = () => {
    if (!firstPromise) return;
    return run(
      () =>
        api.party.adopt({
          source_promise_id: firstPromise.id,
          adopted_title: firstPromise.title,
          adopted_description: firstPromise.description,
          target_metric: firstPromise.target_metric || '90% issue closure',
          timeline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 100).toISOString(),
        }),
      'Promise adopted for public tracking.',
    );
  };
  const publish = () => {
    if (!manifesto) return;
    return run(() => api.manifesto.publish(manifesto.id), 'Manifesto published after human approval.');
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Mumbai Suburban promise workspace"
        description="Rank verified demand, draft voter-readable promises, and compare commitments before adoption."
        eyebrow={<><Sparkles size={16} /> Manifesto readiness</>}
        actions={<Button variant="primary" onClick={generate} disabled={busy}>Generate draft</Button>}
      />

      <section className="metric-grid">
        <MetricCard label="Open demand" value={String(issues.length)} detail="verified or pending reports" />
        <MetricCard label="Draft promises" value={String(manifesto?.promises.length ?? 0)} tone="info" detail="from eligible clusters" />
        <MetricCard label="Adopted" value={String(promises.length)} tone="good" detail="publicly trackable" />
        <MetricCard label="Top score" value={topIssue ? `${priorityFromIssue(topIssue, 0)}` : '0'} tone="warn" detail="cluster priority" />
      </section>

      <section className="workspace-grid">
        <Panel
          className="span-2"
          title="Demand ranking"
          description="Direct values stay visible for field and campaign review; no hover-only evidence."
          actions={<FilterBar><button onClick={() => setParam('category')}>All categories</button><button onClick={() => setParam('category', 'roads')}>Roads</button><input aria-label="Search demand" placeholder="Search" value={search} onChange={event => setParam('search', event.target.value)} /></FilterBar>}
        >
          <DataTable
            columns={['Cluster', 'Category', 'Priority', 'Evidence', 'Action']}
            rows={filteredIssues.map((issue, index) => [
              <strong>{issueTitle(issue)}</strong>,
              <CategoryBadge category={issue.category} />,
              <MiniBar label="score" value={priorityFromIssue(issue, index)} tone={index === 0 ? 'warn' : 'neutral'} />,
              `${issue.privacy} location / ${issue.status}`,
              <Button variant="ghost" onClick={() => setParam('selected', issue.id)}>Open</Button>,
            ])}
          />
        </Panel>

        <Panel title="Pincode coverage" description="Privacy-safe demand concentration.">
          <GeoMap issues={filteredIssues} label="Pincode demand coverage map" />
          {coverageRows.map((row) => <MiniBar key={row.label} label={row.label} value={row.value} tone={row.tone} />)}
        </Panel>

        <Panel className="span-2" title="Manifesto draft" description="Generated from verified clusters only.">
          {!manifesto && <EmptyState title="No draft loaded" copy="Generate a manifesto once volunteer verification creates eligible clusters." />}
          {manifesto?.promises.map((promise) => (
            <article className="queue-row" key={promise.id}>
              <FileText size={20} />
              <div>
                <strong>{promise.title}</strong>
                <p>{promise.description}</p>
                <span>{promise.time_horizon} / {promise.target_metric || 'Metric pending'}</span>
              </div>
            </article>
          ))}
          <ActionBar>
            <Button variant="primary" onClick={adopt} disabled={busy || !firstPromise}>Adopt first promise</Button>
            <Button variant="secondary" onClick={publish} disabled={busy || !manifesto || manifesto.is_published}>
              {manifesto?.is_published ? 'Published' : 'Approve and publish'}
            </Button>
            <Button variant="secondary" disabled={!manifesto?.is_published} onClick={() => manifesto && window.open(api.exports.manifestoPdfUrl(manifesto.id), '_blank', 'noopener,noreferrer')}>Export PDF</Button>
            <Button variant="secondary" onClick={() => setShowComparison(value => !value)}><GitCompareArrows size={16} /> {showComparison ? 'Hide comparison' : 'Compare promises'}</Button>
          </ActionBar>
          {showComparison && <div className="workspace-grid">
            <Panel title="Citizen demand" description="Evidence-linked source wording."><p>{firstPromise?.description || 'Generate a source-linked draft to compare wording.'}</p></Panel>
            <Panel title="Party commitment" description="Official adopted wording and measurable scope."><p>{promises[0]?.adopted_description || 'Adopt a promise to create the party-side comparison.'}</p></Panel>
          </div>}
          {message && <p className="action-message">{message}</p>}
        </Panel>

        <Panel title="Adopted promises" description="Commitments visible to public tracker.">
          {promises.map((promise) => (
            <article className="compact-row" key={promise.id}>
              <div>
                <strong>{promise.adopted_title}</strong>
                <span>{promise.target_metric}</span>
              </div>
              <StatusChip status={promise.status} />
            </article>
          ))}
          {promises[0] && <div>
            <label className="field-label">Owner<input value={owner} onChange={event => setOwner(event.target.value)} /></label>
            <label className="field-label">Estimated cost<input value={cost} onChange={event => setCost(event.target.value)} /></label>
            <label className="field-label">Feasibility notes<textarea value={feasibility} onChange={event => setFeasibility(event.target.value)} /></label>
            <Button disabled={busy} onClick={() => void run(() => api.party.updatePromise(promises[0].id, { owner_department: owner, estimated_cost: cost, feasibility_notes: feasibility }), 'Promise feasibility details saved.')}>Save feasibility</Button>
            <ActionBar>
              <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.party.updatePromise(promises[0].id, { status: 'deferred', feasibility_notes: feasibility }), 'Promise deferred with a public explanation.')}>Defer with explanation</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.party.updatePromise(promises[0].id, { status: 'rejected', feasibility_notes: feasibility }), 'Promise rejected with a public explanation.')}>Reject with explanation</Button>
            </ActionBar>
          </div>}
          <div className="category-mix">
            {categoryMix.map((item) => <MiniBar key={item.category} label={item.category} value={item.value} />)}
          </div>
        </Panel>
      </section>
    </div>
  );
}
