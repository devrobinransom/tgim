import { NextResponse } from 'next/server';
import { clearSession, oidcConfig } from '../../../../lib/oidc-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await clearSession();
  try {
    const target = new URL(oidcConfig().endSessionEndpoint);
    target.searchParams.set('post_logout_redirect_uri', new URL('/', request.url).toString());
    target.searchParams.set('client_id', oidcConfig().clientId);
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
