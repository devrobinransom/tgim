'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient } from '@tgim/api-client';
import type { ApiClient, IssueDetail, ManifestoDetail } from '@tgim/api-client';
import type { AuditEvent, CivicAuthority, PublicIssue, PartyPromise } from '@tgim/shared';
import { API_ORIGIN, AREA_ID } from './portal';
import { getAuthToken } from './authToken';

export interface DashboardData {
  api: ApiClient;
  issues: PublicIssue[];
  manifesto: ManifestoDetail | null;
  promises: PartyPromise[];
  audit: AuditEvent[];
  issueDetail: IssueDetail | null;
  authorities: CivicAuthority[];
  loaded: boolean;
  refresh: () => Promise<void>;
}

export function usePortalApi() {
  return useMemo(() => createApiClient({
    baseUrl: API_ORIGIN,
    getToken: getAuthToken,
  }), []);
}

export function useDashboardData(): DashboardData {
  const api = usePortalApi();
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [manifesto, setManifesto] = useState<ManifestoDetail | null>(null);
  const [promises, setPromises] = useState<PartyPromise[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [issueDetail, setIssueDetail] = useState<IssueDetail | null>(null);
  const [authorities, setAuthorities] = useState<CivicAuthority[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [issueList, promiseList, auditList, authorityList] = await Promise.all([
      api.issues.list({ areaId: AREA_ID }).catch(() => []),
      api.party.listPromises().catch(() => []),
      api.audit.list().catch(() => []),
      api.authorities.list({ areaId: AREA_ID }).catch(() => []),
    ]);
    const normalizedIssues = issueList;
    setIssues(normalizedIssues);
    setPromises(promiseList);
    setAudit(auditList);
    setAuthorities(authorityList);
    setIssueDetail(normalizedIssues[0] ? await api.issues.get(normalizedIssues[0].id).catch(() => null) : null);
    setManifesto(await api.manifesto.get(AREA_ID).catch(() => null));
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [loaded, refresh]);

  return { api, issues, manifesto, promises, audit, issueDetail, authorities, loaded, refresh };
}

export function useAsyncAction(refresh?: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await fn();
        if (refresh) await refresh();
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Request failed');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return { busy, message, run };
}
