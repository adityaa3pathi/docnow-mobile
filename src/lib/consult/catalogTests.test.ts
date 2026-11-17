import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...a: unknown[]) => get(...a) }, errorMessage: () => '' }));
const { catalog, MAX_TESTS, toggleTestCode } = await import('./api');

const reply = (products: unknown[]) => Promise.resolve({ data: { products } });

beforeEach(() => get.mockReset());

describe('catalog.tests', () => {
  it('searches the real catalog endpoint', async () => {
    get.mockReturnValue(reply([{ partnerCode: 'CBC1', name: 'CBC' }]));
    expect(await catalog.tests('cbc')).toEqual([{ partnerCode: 'CBC1', name: 'CBC' }]);
    expect(get).toHaveBeenCalledWith('/api/catalog/products', { params: { search: 'cbc', type: 'TEST,PROFILE', limit: 20 } });
  });

  it('falls back to the A to Z list when nothing is featured', async () => {
    get.mockImplementation((path: string) => { return reply(String(path).endsWith('/featured') ? [] : [{ partnerCode: 'A1', name: 'A' }]); });
    expect(await catalog.tests('')).toEqual([{ partnerCode: 'A1', name: 'A' }]);
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe('toggleTestCode', () => {
  it('adds, removes, and stops at the cap', () => {
    expect(toggleTestCode(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleTestCode(['A', 'B'], 'A')).toEqual(['B']);
    const full = Array.from({ length: MAX_TESTS }, (_, i) => `T${i}`);
    expect(toggleTestCode(full, 'X')).toBe(full);
  });
});
