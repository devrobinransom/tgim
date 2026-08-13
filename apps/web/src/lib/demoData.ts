import type { AuditEvent, PublicIssue, IssueCategory, PartyPromise, PromiseStatus } from '@tgim/shared';
import type { ManifestoDetail } from '@tgim/api-client';

export const areaSummary = {
  name: 'Mumbai Suburban',
  focus: 'Pincode 400064',
  wards: 'Ward 12',
  updated: 'Updated 18 min ago',
};

export const coverageRows = [
  { label: '400064 Malad West', value: 86, tone: 'good' as const },
  { label: '400067 Kandivali West', value: 68, tone: 'warn' as const },
  { label: '400092 Borivali West', value: 52, tone: 'neutral' as const },
  { label: '400101 Kandivali East', value: 43, tone: 'neutral' as const },
];

export const publicTimeline = [
  { label: 'Citizen reports clustered', value: 'Jun 02' },
  { label: 'Volunteer verification', value: 'Jun 09' },
  { label: 'Manifesto-ready promise', value: 'Jun 16' },
  { label: 'Officer update due', value: 'Jul 21' },
];

export const evidenceItems = [
  { label: 'Location matches cluster', detail: '3 reports inside blurred pincode radius', checked: true },
  { label: 'Evidence is clear', detail: '2 photos, 1 public note, duplicate hash clean', checked: true },
  { label: 'Duplicate checked', detail: 'No active duplicate above threshold', checked: true },
];

export const categoryMix: Array<{ category: IssueCategory; value: number }> = [
  { category: 'water', value: 34 },
  { category: 'roads', value: 28 },
  { category: 'garbage', value: 19 },
  { category: 'health', value: 11 },
  { category: 'transport', value: 8 },
];

export function priorityFromIssue(issue: PublicIssue, index: number) {
  const severityWeight: Record<PublicIssue['severity'], number> = {
    low: 42,
    medium: 58,
    high: 76,
    critical: 92,
  };
  return Math.min(98, severityWeight[issue.severity] + Math.max(0, 10 - index * 2));
}

export function issueTitle(issue: PublicIssue) {
  const label = issue.category.charAt(0).toUpperCase() + issue.category.slice(1);
  return `${label} issue near ${areaSummary.focus}`;
}

export function issueFallbacks(): PublicIssue[] {
  const now = new Date();
  return [
    {
      id: 'demo-water-1',
      area_id: 'ward-12-id',
      category: 'water',
      description: 'Repeated low-pressure water supply reported by residents across three lanes.',
      severity: 'high',
      privacy: 'blurred',
      visibility: 'public',
      public_latitude: 19.18,
      public_longitude: 72.84,
      status: 'clustered',
      cluster_id: 'cluster-water-400064',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-roads-1',
      area_id: 'ward-12-id',
      category: 'roads',
      description: 'Pothole cluster on a bus route with school and clinic access impact.',
      severity: 'critical',
      privacy: 'blurred',
      visibility: 'public',
      public_latitude: 19.19,
      public_longitude: 72.85,
      status: 'clustered',
      cluster_id: 'cluster-roads-400064',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-garbage-1',
      area_id: 'ward-12-id',
      category: 'garbage',
      description: 'Overflowing collection point attracting repeated complaints after 8 p.m.',
      severity: 'medium',
      privacy: 'anonymous',
      visibility: 'public',
      public_latitude: 19.18,
      public_longitude: 72.84,
      status: 'open',
      cluster_id: 'cluster-garbage-400064',
      created_at: now,
      updated_at: now,
    },
  ];
}

export function manifestoFallback(): ManifestoDetail {
  const now = new Date();
  return {
    id: 'manifesto-demo',
    area_id: 'ward-12-id',
    version: 1,
    is_published: false,
    created_at: now,
    updated_at: now,
    promises: [
      {
        id: 'promise-water-100',
        manifesto_id: 'manifesto-demo',
        cluster_id: 'cluster-water-400064',
        time_horizon: '100-day',
        title: 'Publish a 100-day ward water pressure repair plan',
        description: 'Map low-pressure lanes, publish repair dates, and report closure evidence for each verified cluster.',
        target_metric: '90% of verified water clusters receive dated closure updates',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'promise-roads-1y',
        manifesto_id: 'manifesto-demo',
        cluster_id: 'cluster-roads-400064',
        time_horizon: '1-year',
        title: 'Prioritize road repairs on school and clinic access routes',
        description: 'Use verified pothole clusters to rank repair packages and publish before/after evidence.',
        target_metric: 'Top 10 verified road clusters completed within one year',
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

export function promiseFallbacks(): PartyPromise[] {
  const now = new Date();
  return [
    {
      id: 'adopted-water-1',
      party_id: 'party-demo',
      source_promise_id: 'promise-water-100',
      adopted_title: '100-day water pressure repair plan',
      adopted_description: 'Publish lane-level repair dates and closure evidence for verified low-pressure clusters.',
      target_metric: '90% closure updates',
      timeline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      status: 'on_track',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'adopted-roads-1',
      party_id: 'party-demo',
      source_promise_id: 'promise-roads-1y',
      adopted_title: 'School-route pothole repair package',
      adopted_description: 'Rank and repair high-severity pothole clusters that affect school, clinic, and bus access.',
      target_metric: '10 clusters completed',
      timeline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 210),
      status: 'delayed',
      created_at: now,
      updated_at: now,
    },
  ];
}

export function auditFallbacks(): AuditEvent[] {
  const now = new Date();
  return [
    {
      id: 'audit-verify-demo',
      actor_id: 'volunteer-demo',
      event_type: 'verification.submitted',
      target_table: 'issue_clusters',
      target_id: 'cluster-water-400064',
      payload: { outcome: 'verified' },
      created_at: now,
    },
    {
      id: 'audit-adopt-demo',
      actor_id: 'party-demo',
      event_type: 'promise.adopted',
      target_table: 'party_promises',
      target_id: 'adopted-water-1',
      payload: { status: 'on_track' },
      created_at: now,
    },
  ];
}

export function statusCounts(promises: PartyPromise[]) {
  return promises.reduce<Record<PromiseStatus, number>>(
    (acc, promise) => {
      acc[promise.status] += 1;
      return acc;
    },
    { draft: 0, published: 0, adopted: 0, completed: 0, on_track: 0, delayed: 0, disputed: 0, deferred: 0, rejected: 0, no_update: 0 },
  );
}
