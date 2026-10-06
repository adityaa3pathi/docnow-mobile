import { describe, expect, it } from 'vitest';

import { acquire, anyCheckoutOpen, checkoutKey, release } from './checkoutLock';

describe('checkout lock', () => {
  it('lets only one holder per booking and frees it on release', () => {
    expect(acquire(checkoutKey('b1'))).toBe(true);
    expect(acquire(checkoutKey('b1'))).toBe(false);
    expect(acquire(checkoutKey('b2'))).toBe(true);
    expect(anyCheckoutOpen()).toBe(true);
    release(checkoutKey('b1'));
    release(checkoutKey('b2'));
    expect(anyCheckoutOpen()).toBe(false);
    expect(acquire(checkoutKey('b1'))).toBe(true);
    release(checkoutKey('b1'));
  });
});
