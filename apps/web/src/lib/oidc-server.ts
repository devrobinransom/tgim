import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const ACCESS_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-tgim_access' : 'tgim_access';
const REFRESH_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-tgim_refresh' : 'tgim_refresh';
export const STATE_COOKIE = '__Host-tgim_oidc_state';
export const VERIFIER_COOKIE = '__Host-tgim_oidc_verifier';
export const RETURN_COOKIE = '__Host-tgim_oidc_return';

type TokenSet = { access_token: string; refresh_token?: string; expires_in?: number; refresh_expires_in?: number; token_type?: string };

function issuer() {
  const value = process.env.OIDC_ISSUER?.replace(/\/$/, '');
  if (!value) throw new Error('OIDC_ISSUER is required');
  return value;
}

export function oidcConfig() {
  const clientId = process.env.OIDC_CLIENT_ID;
  if (!clientId) throw new Error('OIDC_CLIENT_ID is required');
  return {
    clientId,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    authorizationEndpoint: process.env.OIDC_AUTHORIZATION_ENDPOINT || `${issuer()}/protocol/openid-connect/auth`,
    tokenEndpoint: process.env.OIDC_TOKEN_ENDPOINT || `${issuer()}/protocol/openid-connect/token`,
    endSessionEndpoint: process.env.OIDC_END_SESSION_ENDPOINT || `${issuer()}/protocol/openid-connect/logout`,
  };
}

export function randomUrlSafe(size = 32) { return randomBytes(size).toString('base64url'); }
export function pkceChallenge(verifier: string) { return createHash('sha256').update(verifier).digest('base64url'); }
export function safeReturnTo(value: string | null) { return value?.startsWith('/') && !value.startsWith('//') ? value : '/participate'; }
export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function redirectUri(requestUrl: string) {
  return process.env.OIDC_REDIRECT_URI || new URL('/api/auth/callback', requestUrl).toString();
}

export async function exchangeToken(parameters: URLSearchParams): Promise<TokenSet> {
  const config = oidcConfig();
  parameters.set('client_id', config.clientId);
  if (config.clientSecret) parameters.set('client_secret', config.clientSecret);
  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: parameters,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`OIDC token exchange failed (${response.status})`);
  const value = await response.json() as Partial<TokenSet>;
  if (!value.access_token) throw new Error('OIDC token response did not include an access token');
  return value as TokenSet;
}

export async function storeTokenSet(tokenSet: TokenSet) {
  const jar = await cookies();
  const common = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  jar.set(ACCESS_COOKIE, tokenSet.access_token, { ...common, maxAge: Math.max(30, (tokenSet.expires_in || 300) - 15) });
  if (tokenSet.refresh_token) jar.set(REFRESH_COOKIE, tokenSet.refresh_token, { ...common, maxAge: tokenSet.refresh_expires_in || 8 * 60 * 60 });
}

export async function getAccessToken() {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) return access;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  try {
    const tokenSet = await exchangeToken(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }));
    await storeTokenSet(tokenSet);
    return tokenSet.access_token;
  } catch {
    jar.delete(ACCESS_COOKIE); jar.delete(REFRESH_COOKIE);
    return null;
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE); jar.delete(REFRESH_COOKIE);
  jar.delete(STATE_COOKIE); jar.delete(VERIFIER_COOKIE); jar.delete(RETURN_COOKIE);
}
