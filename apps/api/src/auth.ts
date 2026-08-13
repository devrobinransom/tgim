import { createPublicKey, verify } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User, UserRole } from '@tgim/shared';
import { dbService } from './services/db.service.js';

type OidcClaims = {
  iss?: string;
  sub: string;
  aud?: string | string[];
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  primary_email_address?: string;
  email_address?: string;
  tgim_area_id?: string;
  [key: string]: unknown;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

const DEMO_USERS_BY_ROLE: Record<UserRole, string> = {
  citizen: 'default-citizen-id',
  volunteer: 'default-volunteer-id',
  party_lead: 'default-party-id',
  department_officer: 'default-officer-id',
  platform_moderator: 'default-admin-id',
  platform_admin: 'default-admin-id',
};

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function decodeJwtSegment<T>(segment: string): T {
  return JSON.parse(base64UrlDecode(segment).toString('utf8')) as T;
}

function oidcIssuer(): string | null {
  return process.env.OIDC_ISSUER || null;
}

function oidcAudience(): string | null {
  return process.env.OIDC_AUDIENCE || null;
}

function oidcJwksUrl(): string | null {
  if (process.env.OIDC_JWKS_URL) return process.env.OIDC_JWKS_URL;
  const issuer = oidcIssuer();
  return issuer ? `${issuer.replace(/\/$/, '')}/.well-known/jwks.json` : null;
}

async function getJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const url = oidcJwksUrl();
  if (!url) throw new Error('OIDC JWKS is not configured');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unable to fetch OIDC JWKS: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: body.keys, expiresAt: now + 5 * 60 * 1000 };
  return jwksCache.keys;
}

async function verifyOidcJwt(token: string): Promise<OidcClaims> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Malformed bearer token');
  }

  const header = decodeJwtSegment<{ kid?: string; alg?: string }>(encodedHeader);
  if (header.alg !== 'RS256') throw new Error('Unsupported JWT algorithm');

  const keys = await getJwks();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('No matching OIDC signing key');

  const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
  const verified = verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    base64UrlDecode(encodedSignature),
  );
  if (!verified) throw new Error('Invalid OIDC JWT signature');

  const claims = decodeJwtSegment<OidcClaims>(encodedPayload);
  if (!claims.sub) throw new Error('OIDC token is missing subject');
  const issuer = oidcIssuer();
  if (issuer && claims.iss !== issuer.replace(/\/$/, '')) {
    throw new Error('OIDC JWT issuer mismatch');
  }
  const audience = oidcAudience();
  if (audience) {
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(audience)) throw new Error('OIDC JWT audience mismatch');
  } else if (process.env.NODE_ENV === 'production' && issuer) {
    throw new Error('OIDC_AUDIENCE must be configured in production');
  }
  const exp = typeof claims.exp === 'number' ? claims.exp : 0;
  if (!exp && process.env.NODE_ENV === 'production') throw new Error('OIDC token is missing expiry');
  if (exp && exp * 1000 < Date.now()) throw new Error('OIDC JWT is expired');
  return claims;
}

function roleFromHeader(request: FastifyRequest): UserRole | null {
  const demoEnabled = process.env.DEMO_AUTH_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (!demoEnabled) return null;
  const raw = request.headers['x-tgim-demo-role'];
  const role = Array.isArray(raw) ? raw[0] : raw;
  if (!role) return null;
  const allowed: UserRole[] = [
    'citizen',
    'volunteer',
    'party_lead',
    'department_officer',
    'platform_moderator',
    'platform_admin',
  ];
  return allowed.includes(role as UserRole) ? (role as UserRole) : null;
}

async function resolveDemoUser(request: FastifyRequest): Promise<User> {
  const role = roleFromHeader(request) ?? 'citizen';
  const idFromHeader = request.headers['x-tgim-demo-user-id'];
  const id = (Array.isArray(idFromHeader) ? idFromHeader[0] : idFromHeader) || DEMO_USERS_BY_ROLE[role];
  const existing = await dbService.users.findUnique(id);
  if (existing) return existing;

  return dbService.users.create({
    display_name: role === 'platform_admin' ? 'TGIM Admin' : `TGIM ${role.replace('_', ' ')}`,
    role,
    preferred_language: 'en',
  });
}

export async function resolveActor(request: FastifyRequest): Promise<User> {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    if (oidcJwksUrl()) throw new Error('Authentication required');
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_AUTH_ENABLED !== 'true') throw new Error('Authentication is not configured');
    return resolveDemoUser(request);
  }

  const claims = await verifyOidcJwt(token);
  const issuer = claims.iss || oidcIssuer();
  if (!issuer) throw new Error('OIDC token issuer is required');
  return dbService.users.upsertIdentity({
    identity_issuer: issuer.replace(/\/$/, ''),
    identity_subject: claims.sub,
    home_area_id: claims.tgim_area_id,
    email: claims.email || claims.email_address || claims.primary_email_address,
    display_name:
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
      undefined,
  });
}

export async function requireActor(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles?: UserRole[],
): Promise<User | null> {
  try {
    const actor = await resolveActor(request);
    if (allowedRoles && !allowedRoles.includes(actor.role)) {
      reply.status(403).send({
        error: {
          code: 'forbidden',
          message: `Requires one of: ${allowedRoles.join(', ')}`,
          role: actor.role,
        },
      });
      return null;
    }
    return actor;
  } catch (error) {
    reply.status(401).send({
      error: {
        code: 'unauthorized',
        message: error instanceof Error ? error.message : 'Authentication required',
      },
    });
    return null;
  }
}
