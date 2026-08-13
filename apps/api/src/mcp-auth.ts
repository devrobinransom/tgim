import { createPublicKey, timingSafeEqual, verify } from 'node:crypto';

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type McpClaims = {
  iss?: string;
  sub?: string;
  client_id?: string;
  azp?: string;
  aud?: string | string[];
  exp?: number;
  scope?: string;
  scp?: string[];
  organization_id?: string;
};

export type McpPrincipal = {
  clientId: string;
  organizationId?: string;
  scopes: Set<string>;
};

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function claimScopes(claims: McpClaims): Set<string> {
  return new Set([...(claims.scope?.split(/\s+/).filter(Boolean) ?? []), ...(claims.scp ?? [])]);
}

async function loadJwks(): Promise<Jwk[]> {
  const url = process.env.MCP_JWKS_URL;
  if (!url) throw new Error('MCP_JWKS_URL is not configured');
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`Unable to load MCP signing keys (${response.status})`);
  const payload = await response.json() as { keys?: Jwk[] };
  if (!Array.isArray(payload.keys)) throw new Error('MCP issuer returned an invalid JWKS document');
  jwksCache = { keys: payload.keys, expiresAt: Date.now() + 5 * 60_000 };
  return payload.keys;
}

/**
 * Validates a machine-to-machine access token issued by the configured OAuth/OIDC
 * authorization server. This intentionally accepts no demo header or shared API
 * secret: production MCP calls must carry a short-lived signed bearer token.
 */
export async function authenticateMcpBearer(header: string | undefined, requiredScope = 'tgim.read'): Promise<McpPrincipal> {
  if (!process.env.MCP_TOKEN_ISSUER || !process.env.MCP_TOKEN_AUDIENCE || !process.env.MCP_JWKS_URL) {
    throw new Error('MCP OAuth is not configured');
  }
  if (!header?.startsWith('Bearer ')) throw new Error('Bearer token required');
  const token = header.slice('Bearer '.length);
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error('Malformed bearer token');
  const protectedHeader = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8')) as { alg?: string; kid?: string };
  if (protectedHeader.alg !== 'RS256' || !protectedHeader.kid) throw new Error('Unsupported MCP token algorithm');
  const keys = await loadJwks();
  const jwk = keys.find(key => key.kid === protectedHeader.kid && key.use !== 'enc');
  if (!jwk) throw new Error('No matching MCP signing key');
  const signed = Buffer.from(`${encodedHeader}.${encodedPayload}`);
  if (!verify('RSA-SHA256', signed, createPublicKey({ key: jwk as any, format: 'jwk' }), base64UrlDecode(encodedSignature))) throw new Error('Invalid bearer signature');
  const claims = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as McpClaims;
  if (claims.iss !== process.env.MCP_TOKEN_ISSUER!.replace(/\/$/, '')) throw new Error('MCP token issuer mismatch');
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error('MCP bearer token expired');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(process.env.MCP_TOKEN_AUDIENCE)) throw new Error('MCP token audience mismatch');
  const scopes = claimScopes(claims);
  if (!scopes.has(requiredScope)) throw new Error(`MCP token is missing ${requiredScope} scope`);
  const clientId = claims.client_id || claims.azp || claims.sub;
  if (!clientId) throw new Error('MCP token is missing client identity');
  return { clientId, organizationId: claims.organization_id, scopes };
}

/** Constant-time comparison helper for future webhook adapters. */
export function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
