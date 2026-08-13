'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Globe2, Lock, LogOut, MapPin, UserRound, Vote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UserRole } from '@tgim/shared';
import { areaSummary } from '../lib/demoData';
import {
  AREA_ID,
  canAccessPortal,
  portalFromPath,
  portalMeta,
  roleLabel,
  workspacePathForRole,
  workspacePortalForRole,
} from '../lib/portal';
import { useWebSession } from '../lib/useWebSession';

interface WorkspaceNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

function navigationForRole(role: UserRole, areaId: string): WorkspaceNavItem[] {
  const workspacePortal = workspacePortalForRole(role);
  const workspaceMeta = portalMeta[workspacePortal];
  const items: WorkspaceNavItem[] = [{
    to: workspacePathForRole(role),
    label: workspaceMeta.title,
    icon: workspaceMeta.icon,
  }];
  if (workspacePortal !== 'participate') {
    items.push({ to: '/participate', label: portalMeta.participate.title, icon: Vote });
  }
  items.push({ to: `/public/area/${areaId}`, label: portalMeta.public.title, icon: Globe2 });
  return items;
}

function WorkspaceGate({
  title,
  copy,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  copy: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="workspace-gate" aria-live="polite">
      <div className="workspace-gate-icon"><Lock size={22} /></div>
      <div>
        <span className="eyebrow">TGIM workspace</span>
        <h1>{title}</h1>
        <p>{copy}</p>
        <div className="header-actions">
          {primaryHref && primaryLabel ? <Link className="button primary" href={primaryHref}>{primaryLabel} <ArrowRight size={16} /></Link> : null}
          <Link className="button" href={`/public/area/${AREA_ID}`}>View the public record</Link>
        </div>
      </div>
    </section>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/participate';
  const portal = portalFromPath(pathname);
  const meta = portalMeta[portal];
  const Icon = meta.icon;
  const session = useWebSession();
  const user = session.user;
  const areaId = user?.home_area_id || AREA_ID;
  const canAccess = Boolean(user && canAccessPortal(user.role, portal));
  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(pathname)}`;
  const navItems = user ? navigationForRole(user.role, areaId) : [
    { to: `/public/area/${areaId}`, label: portalMeta.public.title, icon: Globe2 },
  ];

  let content: ReactNode;
  if (session.loading) {
    content = <WorkspaceGate title="Opening your workspace" copy="Checking your TGIM identity and access." />;
  } else if (session.error) {
    content = <WorkspaceGate title="Workspace unavailable" copy="TGIM could not verify your session. Try again when the identity service is available." primaryHref={loginHref} primaryLabel="Try signing in" />;
  } else if (!user || !session.authenticated) {
    content = <WorkspaceGate title="Sign in to continue" copy="Public records stay open to everyone. Workspaces open only after TGIM verifies your identity and access." primaryHref={loginHref} primaryLabel="Sign in" />;
  } else if (!canAccess) {
    const homePath = workspacePathForRole(user.role);
    content = <WorkspaceGate title="This is not your workspace" copy={`You are signed in as ${roleLabel(user.role)}. TGIM keeps operational workspaces separate so each team sees only the tools it can use.`} primaryHref={homePath} primaryLabel={`Open ${portalMeta[workspacePortalForRole(user.role)].title.toLowerCase()}`} />;
  } else {
    content = children;
  }

  return (
    <div className="product-shell">
      <aside className="sidebar">
        <Link className="brand" href={`/public/area/${areaId}`} aria-label="TGIM public record">
          <div className="brand-mark">TG</div>
          <div>
            <strong>TGIM</strong>
            <span>The Great Indian Manifesto</span>
          </div>
        </Link>
        <nav aria-label="Your TGIM navigation">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} href={item.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                <ItemIcon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>
        {user ? (
          <div className="identity-card">
            <UserRound size={18} />
            <div>
              <strong>{user.display_name || 'TGIM member'}</strong>
              <span>{roleLabel(user.role)} · {session.mode === 'demo' ? 'local demo' : 'secure session'}</span>
              <a href="/api/auth/logout"><LogOut size={14} /> Sign out</a>
            </div>
          </div>
        ) : (
          <div className="auth-note"><Lock size={16} /><span>Public records are open. Operational work requires a verified identity.</span></div>
        )}
      </aside>

      <main className="workspace-main">
        {canAccess && user ? (
          <div className="topbar">
            <div className="topbar-context">
              <span><Icon size={16} /> {roleLabel(user.role)}</span>
              <strong>{meta.title}</strong>
            </div>
            <div className="area-chip">
              <MapPin size={16} />
              <span>{areaSummary.name} / {areaSummary.focus}</span>
            </div>
          </div>
        ) : null}
        {content}
      </main>
    </div>
  );
}
