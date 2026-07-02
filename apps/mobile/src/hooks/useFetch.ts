import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Refetch-on-focus data hook. Re-runs whenever the screen regains focus so the
 * dashboards stay fresh after a report syncs or a manifesto is generated.
 * Pass a stable `fn` (wrap in useCallback at the call site).
 */
export function useFetch<T>(fn: () => Promise<T>): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let active = true;
    setLoading(true);
    fn()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Request failed');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fn]);

  useFocusEffect(run);

  return { data, loading, error, reload: run };
}
