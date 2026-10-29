import { afterEach, expect, it, vi } from 'vitest';

import { cleanup, renderHook, waitFor } from '@/test-utils/render';

import { AuthProvider, useAuth } from './auth';

const calls = vi.hoisted(() => [] as string[]);

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(async () => ({ data: { user: { id: 'user-1', mobile: '9999999999' } } })),
    post: vi.fn(async (url: string) => {
      calls.push(`post ${url}`);
      return { data: {} };
    }),
  },
  hasTokens: vi.fn(async () => true),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(async () => void calls.push('clearTokens')),
  setSessionExpiredHandler: vi.fn(),
}));

vi.mock('@/lib/push-registration', () => ({
  unregisterPushToken: vi.fn(async () => {
    calls.push('unregisterPushToken');
    return 'removed';
  }),
}));


afterEach(cleanup);

it('unregisters the push token while the session is still valid, before logging out', async () => {
  const { result } = await renderHook(() => useAuth(), AuthProvider);
  await waitFor(() => expect(result.current.user?.id).toBe('user-1'));

  await result.current.signOut();
  await waitFor(() => expect(result.current.user).toBeNull());

  expect(calls).toEqual(['unregisterPushToken', 'post /api/auth/logout', 'clearTokens']);
});
