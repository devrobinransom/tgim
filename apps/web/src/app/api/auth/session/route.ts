import { NextResponse } from 'next/server';
import type { User } from '@tgim/shared';
import { getAccessToken } from '../../../../lib/oidc-server';
import { isWebDemoMode, webDemoRole } from '../../../../lib/demo-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = await getAccessToken();
  const demo = isWebDemoMode();
  const headers = { 'cache-control': 'no-store' };
  if (!token && !demo) return NextResponse.json({ authenticated: false, user: null }, { headers });

  const origin = process.env.API_ORIGIN_INTERNAL?.replace(/\/$/, '');
  if (!origin) {
    return NextResponse.json(
      { authenticated: false, user: null, error: 'session_unavailable' },
      { status: 503, headers },
    );
  }

  const upstreamHeaders = new Headers({ accept: 'application/json' });
  if (token) upstreamHeaders.set('authorization', `Bearer ${token}`);
  if (demo) upstreamHeaders.set('x-tgim-demo-role', webDemoRole());

  try {
    const response = await fetch(`${origin}/api/v1/auth/me`, {
      headers: upstreamHeaders,
      cache: 'no-store',
    });
    if (response.status === 401) return NextResponse.json({ authenticated: false, user: null }, { headers });
    if (!response.ok) throw new Error(`Identity API returned ${response.status}`);
    const body = await response.json() as { user: User };
    const user = body.user;
    return NextResponse.json({
      authenticated: true,
      mode: demo ? 'demo' : 'oidc',
      user: {
        id: user.id,
        display_name: user.display_name,
        role: user.role,
        home_area_id: user.home_area_id,
      },
    }, { headers });
  } catch {
    return NextResponse.json(
      { authenticated: false, user: null, error: 'session_unavailable' },
      { status: 503, headers },
    );
  }
}
