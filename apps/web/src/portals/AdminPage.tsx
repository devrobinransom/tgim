'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import type { DeliveryDispute, ModerationAction, VolunteerApplication } from '@tgim/shared';
import { coverageRows } from '../lib/demoData';
import { useAsyncAction, useDashboardData, usePortalApi } from '../lib/useDashboardData';
import { Button, DataTable, EvidenceRow, MetricCard, MiniBar, PageHeader, Panel, StatusChip } from '../ui/primitives';

export function AdminPage() {
  const { audit, issues, promises } = useDashboardData();
  const api = usePortalApi();
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [disputes, setDisputes] = useState<DeliveryDispute[]>([]);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const reload = useCallback(async () => {
    const [nextApplications, nextDisputes, nextActions] = await Promise.all([
      api.volunteers.applications(), api.disputes.list(), api.moderation.list(),
    ]);
    setApplications(nextApplications);
    setDisputes(nextDisputes);
    setActions(nextActions);
  }, [api]);
  const { busy, message, run } = useAsyncAction(reload);
  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Admin control room"
        description="Govern moderation, role boundaries, pincode coverage, and the audit trail across TGIM products."
        eyebrow={<><Shield size={16} /> Governance and auditability</>}
      />

      <section className="metric-grid">
        <MetricCard label="Audit events" value={String(audit.length)} detail="role and workflow actions" />
        <MetricCard label="Issues" value={String(issues.length)} tone="info" detail="public-safe records" />
        <MetricCard label="Promises" value={String(promises.length)} tone="good" detail="adopted commitments" />
        <MetricCard label="Open reviews" value={String(applications.filter(item => item.status === 'pending').length + disputes.filter(item => item.status === 'open').length)} tone="warn" detail="applications and disputes" />
      </section>

      <section className="workspace-grid">
        <Panel className="span-2" title="Audit explorer" description="Every important role, issue, and promise action is inspectable.">
          <DataTable
            columns={['Event', 'Target', 'Actor', 'Created']}
            rows={audit.map((event) => [
              <strong>{event.event_type}</strong>,
              `${event.target_table} / ${event.target_id}`,
              event.actor_id || 'system',
              new Date(event.created_at).toLocaleString(),
            ])}
          />
        </Panel>

        <Panel title="Role boundaries" description="Admin view of production access rules.">
          <EvidenceRow checked label="Citizen" detail="Can report, support, and view public-safe data" />
          <EvidenceRow checked label="Volunteer" detail="Can submit verification decisions" />
          <EvidenceRow checked label="Party lead" detail="Can generate and adopt promises" />
          <EvidenceRow checked label="Officer" detail="Can publish delivery updates" />
        </Panel>

        <Panel title="Pincode coverage" description="Coverage needs remain visible for ops planning.">
          {coverageRows.map((row) => <MiniBar key={row.label} label={row.label} value={row.value} tone={row.tone} />)}
        </Panel>

        <Panel className="span-2" title="Moderation queue" description="Public safety checks before wider visibility.">
          <DataTable
            columns={['Item', 'Evidence', 'State', 'Action']}
            rows={[
              ...applications.map(item => [
                <strong key={item.id}>Volunteer application</strong>, item.motivation, <StatusChip status={item.status} />,
                item.status === 'pending' ? <Button disabled={busy} onClick={() => void run(() => api.volunteers.review(item.id, { status: 'approved', review_notes: 'Approved after administrator review.' }), 'Volunteer approved.')}>Approve</Button> : 'Reviewed',
              ]),
              ...disputes.map(item => [
                <strong key={item.id}>Delivery dispute</strong>, item.reason, <StatusChip status={item.status} />,
                item.status === 'open' ? <Button disabled={busy} onClick={() => void run(() => api.disputes.resolve(item.id, { status: 'upheld', resolution_notes: 'Evidence reviewed and claim marked disputed.', publish_outcome: true, public_rationale: 'Evidence was reviewed and the published accountability record now reflects the disputed claim.' }), 'Dispute upheld and public outcome recorded.')}>Uphold</Button> : 'Resolved',
              ]),
              ...actions.map(item => [<strong key={item.id}>{item.action}</strong>, item.reason, <StatusChip status="recorded" />, <><Lock size={14} /> Audited</>]),
            ]}
          />
          {applications.length + disputes.length + actions.length === 0 && <p>No pending governance work.</p>}
          {message && <p className="action-message">{message}</p>}
        </Panel>
      </section>
    </div>
  );
}
