'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Bell, BookOpen, LogOut, Map, Search, TriangleAlert, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AREA_ID, workspacePathForRole } from '../lib/portal';
import { useWebSession } from '../lib/useWebSession';

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || `/public/area/${AREA_ID}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useWebSession();
  const areaId = session.user?.home_area_id || AREA_ID;
  const publicPath = `/public/area/${areaId}`;
  const manifestoPath = `/public/manifestos/${areaId}`;
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent('/participate')}`;
  const initialQuery = searchParams?.get('search') ?? searchParams?.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  // Sync input when URL query changes via category cards or external navigation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  const navItems = [
    { to: publicPath, label: 'Public record' },
    { to: manifestoPath, label: 'Manifesto' },
    { to: '/participate', label: 'Take part' },
  ];

  return (
    <div className="public-site">
      <header className="public-site-header">
        <Link className="public-brand" href={publicPath} aria-label="TGIM public record home">
          <span className="brand-mark">TG<span>I</span>M</span>
          <span><strong>TGIM</strong><small>THE GREAT INDIAN MANIFESTO</small></span>
        </Link>
        <form
          className="public-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = query.trim();
            const next = trimmed ? `${publicPath}?search=${encodeURIComponent(trimmed)}` : publicPath;
            router.push(next);
          }}
        >
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search the public record"
            placeholder="Search state, district, constituency, issue"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="public-site-nav" aria-label="Public navigation">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return <Link key={item.to} href={item.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
          })}
        </nav>
        <div className="public-session-actions">
          <button className="public-icon-button" type="button" aria-label="Notifications"><Bell size={18} /></button>
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
      <nav className="public-mobile-nav" aria-label="Public shortcuts">
        <Link className={pathname === publicPath ? 'active' : undefined} href={publicPath}><Map size={19} /><span>Map</span></Link>
        <Link href={`${publicPath}#evidence`}><TriangleAlert size={19} /><span>Problems</span></Link>
        <Link className={pathname.startsWith(manifestoPath) ? 'active' : undefined} href={manifestoPath}><BookOpen size={19} /><span>Manifesto</span></Link>
        <Link href="/participate"><UserRound size={19} /><span>Me</span></Link>
      </nav>
    </div>
  );
}
