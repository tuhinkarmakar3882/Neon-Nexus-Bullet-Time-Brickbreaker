'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signOutFirebase,
  subscribeAuth,
} from '@/lib/auth/firebaseClient';
import {
  setSyncSignedIn,
  syncIfSignedIn,
  onFirstSignIn,
} from '@/lib/persistence/SyncEngine';
import { getSyncState } from '@/lib/persistence/Persistence';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  syncState: ReturnType<typeof getSyncState>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncStateLocal] = useState(getSyncState);
  const configured = isFirebaseConfigured();

  const refreshSyncState = useCallback(() => {
    setSyncStateLocal(getSyncState());
  }, []);

  useEffect(() => {
    const refresh = () => refreshSyncState();
    window.addEventListener('neon:save-synced', refresh);
    window.addEventListener('neon:storage', refresh);
    return () => {
      window.removeEventListener('neon:save-synced', refresh);
      window.removeEventListener('neon:storage', refresh);
    };
  }, [refreshSyncState]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    return subscribeAuth(async (u) => {
      setUser(u);
      setLoading(false);
      setSyncSignedIn(!!u);
      if (u) {
        await onFirstSignIn();
        refreshSyncState();
      }
    });
  }, [configured, refreshSyncState]);

  const signIn = useCallback(async () => {
    await signInWithGoogle();
    await onFirstSignIn();
    refreshSyncState();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('neon:cloud-sync-enabled'));
    }
  }, [refreshSyncState]);

  const signOut = useCallback(async () => {
    await signOutFirebase();
    setSyncSignedIn(false);
    setUser(null);
    refreshSyncState();
  }, [refreshSyncState]);

  const syncNow = useCallback(async () => {
    const { syncNow: doSync } = await import('@/lib/persistence/SyncEngine');
    const ok = await doSync({ pullFirst: true });
    refreshSyncState();
    return ok;
  }, [refreshSyncState]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      syncState,
      signIn,
      signOut,
      syncNow,
    }),
    [user, loading, configured, syncState, signIn, signOut, syncNow],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      configured: false,
      syncState: getSyncState(),
      signIn: async () => {},
      signOut: async () => {},
      syncNow: async () => false,
    };
  }
  return ctx;
}
