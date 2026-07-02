import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '@tgim/shared';

/**
 * Sandbox session: role + language + whether onboarding is done. No real auth
 * yet (the API hardcodes actor ids) — this mirrors the web sim's role switcher.
 */

const STORAGE_KEY = 'tgim:session:v1';

interface SessionState {
  role: UserRole;
  language: string;
  onboarded: boolean;
}

const DEFAULT: SessionState = { role: 'citizen', language: 'en', onboarded: false };

interface SessionContextValue extends SessionState {
  ready: boolean;
  setRole: (role: UserRole) => void;
  setLanguage: (language: string) => void;
  completeOnboarding: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setState(JSON.parse(raw) as SessionState);
      setReady(true);
    });
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const update = (patch: Partial<SessionState>) =>
      setState((prev) => {
        const next = { ...prev, ...patch };
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    return {
      ...state,
      ready,
      setRole: (role) => update({ role }),
      setLanguage: (language) => update({ language }),
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
