import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '@tgim/shared';

/**
 * Device preferences only. In sovereign production the API derives roles from
 * the OIDC identity and scope grants; this role is sent only in explicit demo mode.
 */

const STORAGE_KEY = 'tgim:session:v1';

export interface SavedArea {
  id: string;
  name: string;
}

interface SessionState {
  role: UserRole;
  language: string;
  onboarded: boolean;
  areaId: string;
  areaName: string;
  interests: string[];
}

const DEFAULT: SessionState = {
  role: 'citizen',
  language: 'en',
  onboarded: false,
  areaId: '',
  areaName: '',
  interests: [],
};

interface SessionContextValue extends SessionState {
  ready: boolean;
  setRole: (role: UserRole) => void;
  setLanguage: (language: string) => void;
  setArea: (area: SavedArea) => void;
  setInterests: (interests: string[]) => void;
  completeOnboarding: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((raw) => {
      if (raw) setState(JSON.parse(raw) as SessionState);
      setReady(true);
    });
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const update = (patch: Partial<SessionState>) =>
      setState((prev) => {
        const next = { ...prev, ...patch };
        void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
        return next;
      });
    return {
      ...state,
      ready,
      setRole: (role) => update({ role }),
      setLanguage: (language) => update({ language }),
      setArea: (area) => update({ areaId: area.id, areaName: area.name }),
      setInterests: (interests) => update({ interests }),
      completeOnboarding: () => update({ onboarded: true }),
    };
  }, [state, ready]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
