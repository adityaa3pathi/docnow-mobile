import { describe, expect, it } from 'vitest';

import { cartFunnel } from './recommendedTests';

const TESTS = [
    { code: 'CBC', name: 'Complete Blood Count' },
    { code: 'LIPID', name: 'Lipid Profile' },
    { code: 'TSH', name: 'Thyroid (TSH)' },
];

describe('prescription "Book All Tests" funnel', () => {
    it('goes straight to slot & address when every test was added', () => {
        const f = cartFunnel({ added: ['CBC', 'LIPID'], skipped: [] }, TESTS);
        expect(f.headline).toBe('✓ Added 2 tests to your cart');
        expect(f.added.map((t) => t.name)).toEqual(['Complete Blood Count', 'Lipid Profile']);
        expect(f.cta).toEqual({ label: 'Proceed to Select Slot & Address →', href: '/tests/checkout' });
    });

    it('routes through the cart when some tests were already there', () => {
        const f = cartFunnel({ added: ['CBC'], skipped: [{ code: 'LIPID', reason: 'Already in cart' }] }, TESTS);
        expect(f.headline).toBe('✓ Added 1 test to your cart');
        expect(f.alreadyInCart.map((t) => t.code)).toEqual(['LIPID']);
        expect(f.cta).toEqual({ label: 'View in Cart & Checkout →', href: '/(tabs)/tests' });
    });

    it('says so when everything was already in the cart', () => {
        expect(cartFunnel({ added: [], skipped: [{ code: 'CBC', reason: 'Already in cart' }] }, TESTS).headline).toBe(
            '✓ This test is already in your cart',
        );
        const all = cartFunnel({ added: [], skipped: TESTS.map((t) => ({ code: t.code, reason: 'Already in cart' })) }, TESTS);
        expect(all.headline).toBe('✓ All 3 tests are already in your cart');
        expect(all.cta?.href).toBe('/(tabs)/tests');
    });

    it('offers no checkout when nothing could be added, and explains why per test', () => {
        const f = cartFunnel({ added: [], skipped: [{ code: 'TSH', reason: 'Test not available' }] }, TESTS);
        expect(f.headline).toBe('We could not add these tests');
        expect(f.unavailable).toEqual([{ test: { code: 'TSH', name: 'Thyroid (TSH)' }, reason: 'Test not available' }]);
        expect(f.cta).toBeNull();
    });

    it('falls back to the code for a test missing from the prescription list', () => {
        expect(cartFunnel({ added: ['XYZ'], skipped: [] }, TESTS).added).toEqual([{ code: 'XYZ', name: 'XYZ' }]);
    });
});
