'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="ledger-empty"><h1>This workspace could not load</h1><p>The failure was contained. You can retry without losing submitted records.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
