import { getAccessToken } from '../../../../lib/oidc-server';
import { isWebDemoMode, webDemoRole } from '../../../../lib/demo-auth';

export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-length']);

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const origin = process.env.API_ORIGIN_INTERNAL?.replace(/\/$/, '');
  if (!origin) return Response.json({ error: { code: 'api_not_configured', message: 'API_ORIGIN_INTERNAL is required.' } }, { status: 503 });
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const upstream = new URL(`${origin}/${path.map(encodeURIComponent).join('/')}${incoming.search}`);
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'if-none-match', 'x-request-id']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  const token = await getAccessToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (isWebDemoMode()) headers.set('x-tgim-demo-role', webDemoRole());
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  try {
    const response = await fetch(upstream, { method: request.method, headers, body, cache: 'no-store', redirect: 'manual' });
    const outgoing = new Headers();
    response.headers.forEach((value, name) => { if (!HOP_BY_HOP.has(name.toLowerCase())) outgoing.set(name, value); });
    outgoing.set('cache-control', 'no-store');
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ error: { code: 'api_unreachable', message: 'The TGIM API is unavailable.' } }, { status: 502 });
  }
}

export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
