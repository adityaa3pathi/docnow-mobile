import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
  sendOtp: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    (async () => {
      try {
        if (await hasTokens()) {
          const { data } = await api.get('/api/auth/me');
          setUser(data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendOtp = useCallback(async (mobile: string) => {
    await api.post('/api/auth/login/send-otp', { mobile });
  }, []);

  const verifyOtp = useCallback(async (mobile: string, code: string) => {
    const { data } = await api.post('/api/auth/login/verify-otp', { mobile, code });
    await saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sendOtp, verifyOtp, signOut }),
    [user, loading, sendOtp, verifyOtp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
