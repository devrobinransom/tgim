// Browser JavaScript never receives the OIDC access token. The Next.js BFF
// reads it from an HttpOnly cookie and adds the Authorization header upstream.
export const oidcConfigured = process.env.NEXT_PUBLIC_OIDC_ENABLED === 'true';
export function getAuthToken(): null { return null; }
