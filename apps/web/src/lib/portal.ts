import type { LucideIcon } from 'lucide-react';
import { Activity, ClipboardCheck, Globe2, Landmark, Shield, Vote } from 'lucide-react';
import type { UserRole } from '@tgim/shared';

export type Portal = 'party' | 'volunteer' | 'officer' | 'admin' | 'participate' | 'public';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || '/api/bff';
export const AREA_ID = process.env.NEXT_PUBLIC_DEFAULT_AREA_ID || '10000000-0000-4000-8000-000000000012';
export const DEMO_CLUSTER_ID = 'de1bcf20-1a42-4912-8824-c10df8a8470a';

export const portalMeta: Record<Portal, { title: string; description: string; icon: LucideIcon }> = {
  party: {
    title: 'Promise workspace',
    description: 'Convert verified citizen demand into promises that voters can inspect.',
    icon: Landmark,
  },
  volunteer: {
    title: 'Verification queue',
    description: 'Review clusters, evidence, and local context before promises are drafted.',
    icon: ClipboardCheck,
  },
  officer: {
    title: 'Delivery updates',
    description: 'Publish delivery updates against adopted promises with evidence and dates.',
    icon: Activity,
  },
  admin: {
    title: 'Platform operations',
    description: 'Monitor role boundaries, moderation, coverage, and the public audit trail.',
    icon: Shield,
  },
  participate: {
    title: 'Take part',
    description: 'Complete versioned civic forms and vote in eligible local polls.',
    icon: Vote,
  },
  public: {
    title: 'Public record',
    description: 'Privacy-safe view of area demand, adopted promises, and delivery evidence.',
    icon: Globe2,
  },
};

export function portalFromPath(pathname: string): Portal {
  const segment = pathname.split('/')[1] as Portal | undefined;
  if (segment && segment in portalMeta) return segment;
  return 'participate';
}

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    citizen: 'Resident',
    volunteer: 'Verifier',
    party_lead: 'Party lead',
    department_officer: 'Department officer',
    platform_moderator: 'Platform moderator',
    platform_admin: 'Platform administrator',
  };
  return labels[role];
}

export function workspacePortalForRole(role: UserRole): Exclude<Portal, 'public'> {
  if (role === 'party_lead') return 'party';
  if (role === 'volunteer') return 'volunteer';
  if (role === 'department_officer') return 'officer';
  if (role === 'platform_moderator' || role === 'platform_admin') return 'admin';
  return 'participate';
}

export function workspacePathForRole(role: UserRole) {
  return `/${workspacePortalForRole(role)}`;
}

export function canAccessPortal(role: UserRole, portal: Portal) {
  if (portal === 'public' || portal === 'participate') return true;
  if (portal === 'admin') return role === 'platform_moderator' || role === 'platform_admin';
  return workspacePortalForRole(role) === portal;
}
