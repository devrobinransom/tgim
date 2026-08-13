import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeToken, redirectUri, RETURN_COOKIE, safeEqual, safeReturnTo, STATE_COOKIE, storeTokenSet, VERIFIER_COOKIE } from '../../../../lib/oidc-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
  const jar = await cookies(); const expectedState = jar.get(STATE_COOKIE)?.value; const verifier = jar.get(VERIFIER_COOKIE)?.value;
  if (!code || !state || !expectedState || !verifier || !safeEqual(state, expectedState)) {
    return NextResponse.json({ error: { code: 'invalid_oidc_callback', message: 'The sign-in response could not be verified.' } }, { status: 400 });
  }
  try {
    const tokenSet = await exchangeToken(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(request.url), code_verifier: verifier }));
    await storeTokenSet(tokenSet);
    const destination = safeReturnTo(jar.get(RETURN_COOKIE)?.value || null);
    jar.delete(STATE_COOKIE); jar.delete(VERIFIER_COOKIE); jar.delete(RETURN_COOKIE);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    return NextResponse.json({ error: { code: 'oidc_exchange_failed', message: error instanceof Error ? error.message : 'Sign-in failed' } }, { status: 502 });
  }
}
