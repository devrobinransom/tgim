import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { registerAuthTokenProvider } from '../api';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'tgim:oidc:tokens:v1';

type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
};

type OidcContextValue = {
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const OidcContext = createContext<OidcContextValue | null>(null);

function readConfig() {
  const extra = Constants.expoConfig?.extra as { oidcIssuer?: string; oidcClientId?: string } | undefined;
  const issuer = (process.env.EXPO_PUBLIC_OIDC_ISSUER || extra?.oidcIssuer || '').replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID || extra?.oidcClientId || '';
  return { issuer, clientId, configured: Boolean(issuer && clientId) };
}

function asStoredTokens(value: AuthSession.TokenResponse, previous?: StoredTokens): StoredTokens {
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken || previous?.refreshToken,
    idToken: value.idToken || previous?.idToken,
    expiresAt: value.expiresIn ? (value.issuedAt + value.expiresIn) * 1000 : undefined,
  };
}

async function persist(tokens: StoredTokens | null) {
  if (tokens) await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function OidcSessionProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => readConfig(), []);
  const discovery = useMemo<AuthSession.DiscoveryDocument | null>(() => config.configured ? {
    authorizationEndpoint: `${config.issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${config.issuer}/protocol/openid-connect/token`,
    revocationEndpoint: `${config.issuer}/protocol/openid-connect/revoke`,
    endSessionEndpoint: `${config.issuer}/protocol/openid-connect/logout`,
  } : null, [config]);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'tgim', path: 'auth/callback' }), []);
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: config.clientId || 'tgim-unconfigured',
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    usePKCE: true,
  }, discovery);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    void SecureStore.getItemAsync(TOKEN_KEY).then(raw => {
      if (raw) setTokens(JSON.parse(raw) as StoredTokens);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const validAccessToken = useCallback(async () => {
    if (!tokens) return null;
    if (!tokens.expiresAt || tokens.expiresAt > Date.now() + 60_000) return tokens.accessToken;
    if (!tokens.refreshToken || !discovery) return null;
    try {
      const refreshed = await AuthSession.refreshAsync({ clientId: config.clientId, refreshToken: tokens.refreshToken }, discovery);
      const next = asStoredTokens(refreshed, tokens);
      setTokens(next); await persist(next); return next.accessToken;
    } catch {
      setTokens(null); await persist(null); return null;
    }
  }, [config.clientId, discovery, tokens]);

  useEffect(() => {
    registerAuthTokenProvider(validAccessToken);
    return () => registerAuthTokenProvider(null);
  }, [validAccessToken]);

  useEffect(() => {
    if (!response || response.type !== 'success' || !request?.codeVerifier || !discovery) return;
    const code = response.params.code;
    const responseKey = `${code}:${response.url}`;
    if (!code || handledResponse.current === responseKey) return;
    handledResponse.current = responseKey; setBusy(true); setError(null);
    void AuthSession.exchangeCodeAsync({ clientId: config.clientId, code, redirectUri, extraParams: { code_verifier: request.codeVerifier } }, discovery)
      .then(async value => { const next = asStoredTokens(value); setTokens(next); await persist(next); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Sign-in could not be completed.'))
      .finally(() => setBusy(false));
  }, [config.clientId, discovery, redirectUri, request, response]);

  const signIn = useCallback(async () => {
    if (!config.configured || !request) { setError('OIDC is not configured in this build.'); return; }
    setError(null); setBusy(true);
    try {
      const result = await promptAsync();
      if (result.type === 'error') setError(result.error?.message || 'Sign-in failed.');
    } finally { setBusy(false); }
  }, [config.configured, promptAsync, request]);

  const signOut = useCallback(async () => {
    const previous = tokens; setTokens(null); await persist(null);
    if (discovery?.endSessionEndpoint && previous?.idToken) {
      const target = new URL(discovery.endSessionEndpoint);
      target.searchParams.set('id_token_hint', previous.idToken);
      target.searchParams.set('post_logout_redirect_uri', redirectUri);
      await WebBrowser.openAuthSessionAsync(target.toString(), redirectUri);
    }
  }, [discovery, redirectUri, tokens]);

  const value = useMemo<OidcContextValue>(() => ({ ready, configured: config.configured, authenticated: Boolean(tokens), busy, error, signIn, signOut }), [busy, config.configured, error, ready, signIn, signOut, tokens]);
  return <OidcContext.Provider value={value}>{children}</OidcContext.Provider>;
}

export function useOidcSession() {
  const value = useContext(OidcContext);
  if (!value) throw new Error('useOidcSession must be used inside OidcSessionProvider');
  return value;
}
