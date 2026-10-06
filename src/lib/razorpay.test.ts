import { describe, expect, it } from 'vitest';

import { FAILED_MESSAGE, mapCheckoutError, mapCheckoutSuccess, SdkMissingError } from './razorpay-errors';

describe('mapCheckoutError', () => {
  it('maps a cancel code to dismissed', () => {
    expect(mapCheckoutError({ code: 2, description: 'Payment Cancelled' })).toEqual({ kind: 'dismissed' });
  });
  it('maps every other code to a non-committal failure', () => {
    for (const code of [0, 1, 3, 4, 'BAD_REQUEST_ERROR']) {
      const out = mapCheckoutError({ code, description: 'Payment failed' });
      expect(out).toEqual({ kind: 'failed', message: FAILED_MESSAGE });
    }
    expect(FAILED_MESSAGE.toLowerCase()).toContain('if money was taken');
  });
  it('maps a missing SDK, or a checkout that threw before opening, to could-not-open', () => {
    expect(mapCheckoutError(new SdkMissingError())).toEqual({ kind: 'could_not_open' });
    expect(mapCheckoutError(new TypeError('undefined is not a function'))).toEqual({ kind: 'could_not_open' });
  });
  it('treats an unknown shape as failed, not as a cancel', () => {
    expect(mapCheckoutError(undefined).kind).toBe('failed');
    expect(mapCheckoutError('boom').kind).toBe('failed');
  });
});

describe('mapCheckoutSuccess', () => {
  it('returns the three fields when all are present', () => {
    const p = { razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_1', razorpay_signature: 'sig' };
    expect(mapCheckoutSuccess({ ...p, extra: 1 })).toEqual({ kind: 'paid', payment: p });
  });
  it('does not call a result with a missing field paid', () => {
    expect(mapCheckoutSuccess({ razorpay_payment_id: 'pay_1' }).kind).toBe('failed');
    expect(mapCheckoutSuccess(null).kind).toBe('failed');
  });
});
