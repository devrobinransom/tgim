import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { oidcConfig, pkceChallenge, randomUrlSafe, redirectUri, RETURN_COOKIE, safeReturnTo, STATE_COOKIE, VERIFIER_COOKIE } from '../../../../lib/oidc-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const config = oidcConfig();
    const state = randomUrlSafe(); const verifier = randomUrlSafe(64);
    const jar = await cookies();
    const common = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 600 };
    jar.set(STATE_COOKIE, state, common); jar.set(VERIFIER_COOKIE, verifier, common);
    jar.set(RETURN_COOKIE, safeReturnTo(new URL(request.url).searchParams.get('returnTo')), common);
    const target = new URL(config.authorizationEndpoint);
    target.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', scope: 'openid profile email', redirect_uri: redirectUri(request.url), state, code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256' }).toString();
    return NextResponse.redirect(target);
  } catch (error) {
    return NextResponse.json({ error: { code: 'oidc_not_configured', message: error instanceof Error ? error.message : 'OIDC unavailable' } }, { status: 503 });
  }
}
