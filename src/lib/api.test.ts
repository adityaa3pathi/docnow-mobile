import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => store.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void store.set(k, v),
  deleteItemAsync: async (k: string) => void store.delete(k),
}));
vi.mock('@/lib/consult/time', () => ({ recordServerDate: () => {} }));

process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
const axios = (await import('axios')).default;
const { api, setSessionExpiredHandler } = await import('./api');

/** Scripted server: each URL answers from its own queue, in order. */
function server(routes: Record<string, { status: number; data?: unknown }[]>) {
  const calls: { url: string; auth?: string }[] = [];
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url ?? '', auth: config.headers?.Authorization as string | undefined });
    const r = routes[config.url ?? '']?.shift() ?? { status: 404 };
    const res = { data: r.data ?? {}, status: r.status, statusText: '', headers: {}, config };
    if (r.status >= 400) throw Object.assign(new Error(`HTTP ${r.status}`), { isAxiosError: true, config, response: res });
    return res;
  };
  return calls;
}

beforeEach(() => {
  store.clear();
  store.set('docnow_access', 'old-access');
  store.set('docnow_refresh', 'refresh-1');
  vi.restoreAllMocks();
});

describe('session refresh', () => {
  it('refreshes an expired token on /api/auth/me instead of logging the user out', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'refresh-2' } });
    const calls = server({ '/api/auth/me': [{ status: 401 }, { status: 200, data: { user: { id: 'u1' } } }] });

    const res = await api.get('/api/auth/me');
    expect(res.data.user.id).toBe('u1');
    expect(calls.map((c) => c.auth)).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(expired).not.toHaveBeenCalled();
    expect(store.get('docnow_refresh')).toBe('refresh-2');
  });

  it('refreshes before logging out, so the server session really ends', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'refresh-2' } });
    const calls = server({ '/api/auth/logout': [{ status: 401 }, { status: 200 }] });
    await api.post('/api/auth/logout');
    expect(calls).toHaveLength(2);
    expect(calls[1].auth).toBe('Bearer new-access');
  });

  it('never tries to refresh for login calls', async () => {
    const post = vi.spyOn(axios, 'post');
    server({ '/api/auth/login/verify-otp': [{ status: 401 }] });
    await expect(api.post('/api/auth/login/verify-otp', {})).rejects.toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});
