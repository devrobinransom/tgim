'use client';

import { useEffect, useState } from 'react';
import type { WebSession } from './session';

const signedOut: WebSession = { authenticated: false, user: null };

export function useWebSession() {
  const [session, setSession] = useState<WebSession>(signedOut);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json() as WebSession;
        if (!response.ok && !body.error) throw new Error('Session unavailable');
        return body;
      })
      .then((body) => { if (active) setSession(body); })
      .catch(() => { if (active) setSession({ ...signedOut, error: 'session_unavailable' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { ...session, loading };
}
