import { Suspense } from 'react';
import { PartyPage } from '../../../portals/PartyPage';

export default function Page() {
  return <Suspense fallback={<div className="page-stack"><p>Loading party workspace…</p></div>}><PartyPage /></Suspense>;
}
