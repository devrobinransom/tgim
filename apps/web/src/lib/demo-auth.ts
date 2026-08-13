import type { UserRole } from '@tgim/shared';

const USER_ROLES: UserRole[] = [
  'citizen',
  'volunteer',
  'party_lead',
  'department_officer',
  'platform_moderator',
  'platform_admin',
];

export function isWebDemoMode() {
  return process.env.NODE_ENV !== 'production' && process.env.WEB_DEMO_MODE === 'true';
}

export function webDemoRole(): UserRole {
  const configured = process.env.WEB_DEMO_ROLE;
  return USER_ROLES.includes(configured as UserRole) ? configured as UserRole : 'citizen';
}
