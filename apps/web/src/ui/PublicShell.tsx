'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { AREA_ID, workspacePathForRole } from '../lib/portal';
import { useWebSession } from '../lib/useWebSession';

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || `/public/area/${AREA_ID}`;
  const session = useWebSession();
  const areaId = session.user?.home_area_id || AREA_ID;
  const publicPath = `/public/area/${areaId}`;
  const manifestoPath = `/public/manifestos/${areaId}`;
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent('/participate')}`;

  const navItems = [
    { to: publicPath, label: 'Public record' },
    { to: manifestoPath, label: 'Manifesto' },
    { to: '/participate', label: 'Take part' },
  ];

  return (
    <div className="public-site">
      <header className="public-site-header">
        <Link className="public-brand" href={publicPath} aria-label="TGIM public record home">
          <span className="brand-mark">TG</span>
          <span><strong>TGIM</strong><small>Public accountability</small></span>
        </Link>
        <nav className="public-site-nav" aria-label="Public navigation">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return <Link key={item.to} href={item.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
          })}
        </nav>
        <div className="public-session-actions">
          {session.loading ? <span className="session-status">Checking session…</span> : null}
          {!session.loading && session.authenticated && session.user ? (
            <>
              <Link className="button primary" href={workspacePathForRole(session.user.role)}>Your workspace <ArrowRight size={16} /></Link>
              <a className="icon-link" href="/api/auth/logout" aria-label="Sign out"><LogOut size={17} /></a>
            </>
          ) : null}
          {!session.loading && !session.authenticated ? <a className="button" href={loginHref}>Sign in</a> : null}
        </div>
      </header>
      <div className="public-site-content">{children}</div>
    </div>
  );
}
