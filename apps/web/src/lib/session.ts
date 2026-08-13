import type { UserRole } from '@tgim/shared';

export interface SessionUser {
  id: string;
  display_name?: string;
  role: UserRole;
  home_area_id?: string;
}

export interface WebSession {
  authenticated: boolean;
  mode?: 'demo' | 'oidc';
  user: SessionUser | null;
  error?: 'session_unavailable';
}
