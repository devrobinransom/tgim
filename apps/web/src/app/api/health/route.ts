import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const oidcReady = Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);
  const apiReady = Boolean(process.env.API_ORIGIN_INTERNAL);
  const productionReady = process.env.NODE_ENV !== 'production' || (oidcReady && apiReady && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true');
  return NextResponse.json({ status: productionReady ? 'ready' : 'not_ready', oidc: oidcReady, api: apiReady }, { status: productionReady ? 200 : 503 });
}
