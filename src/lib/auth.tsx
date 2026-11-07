import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isAxiosError } from 'axios';

import { api, clearTokens, hasTokens, saveTokens, setSessionExpiredHandler } from '@/lib/api';

export type User = {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  role: 'USER' | 'MANAGER' | 'SUPER_ADMIN' | 'DOCTOR';
};

type AuthState = {
  user: User | null;
  loading: boolean;
  /** Signed in, but DocNow could not be reached at launch; the session is kept. */
  offline: boolean;
  retry: () => void;
  sendOtp: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Local sign-out must work even when offline or the token is dead.
    }
    await clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (await hasTokens()) {
          const { data } = await api.get('/api/auth/me');
          if (!live) return;
          setUser(data.user);
        }
        if (live) setOffline(false);
      } catch (e) {
        if (!live) return;
        // No connection or a server fault says nothing about the session: keep it and offer a retry
        // instead of sending a signed-in patient to the OTP screen they can't use offline.
        const unreachable = isAxiosError(e) && (!e.response || e.response.status >= 500);
        setOffline(unreachable && (await hasTokens()));
        setUser(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [attempt]);

  const sendOtp = useCallback(async (mobile: string) => {
    await api.post('/api/auth/login/send-otp', { mobile });
  }, []);

  const verifyOtp = useCallback(async (mobile: string, code: string) => {
    const { data } = await api.post('/api/auth/login/verify-otp', { mobile, code });
    await saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, offline, retry, sendOtp, verifyOtp, signOut }),
    [user, loading, offline, retry, sendOtp, verifyOtp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
