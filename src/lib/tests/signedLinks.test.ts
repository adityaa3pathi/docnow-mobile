import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { invoicesApi, reportsApi } from './api';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signed document links (no sign-in header needed)', () => {
  it('fetches an invoice link token for the booking, then builds the public URL from it', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.docnow.test');
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { token: 'tok.sig', expiresInHours: 72 } });

    const { token } = await invoicesApi.link('bk-1');

    expect(get).toHaveBeenCalledWith('/api/invoices/booking/bk-1/link', expect.anything());
    expect(invoicesApi.publicUrl(token)).toBe('https://api.docnow.test/api/invoices/public/tok.sig');
  });

  it('builds the public report URL from the viewer token', () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.docnow.test');
    expect(reportsApi.publicUrl('rtok.sig')).toBe('https://api.docnow.test/api/reports/public/rtok.sig');
  });
});
