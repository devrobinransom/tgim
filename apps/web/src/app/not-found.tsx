import Link from 'next/link';

export default function NotFound() {
  return <main className="ledger-empty"><h1>Record not found</h1><p>This link is incomplete, private, or no longer published.</p><Link className="button secondary" href="/party">Return to TGIM</Link></main>;
}
