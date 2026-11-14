import { describe, expect, it } from 'vitest';

import { campPayCta, campSummaryLines, campTotals } from './money';

describe('campTotals', () => {
    it('is the camp price when nothing is applied', () => {
        expect(campTotals({ price: 499 })).toEqual({ price: 499, discountAmount: 0, walletDeduction: 0, finalPayable: 499 });
    });

    it('takes the promo off, then the wallet', () => {
        expect(campTotals({ price: 1000, discountAmount: 200, walletBalance: 300, useWallet: true })).toEqual({
            price: 1000,
            discountAmount: 200,
            walletDeduction: 300,
            finalPayable: 500,
        });
    });

    it('ignores the wallet until it is turned on', () => {
        expect(campTotals({ price: 1000, walletBalance: 300 }).finalPayable).toBe(1000);
    });

    it('never takes more wallet than is left to pay', () => {
        const totals = campTotals({ price: 400, discountAmount: 100, walletBalance: 5000, useWallet: true });
        expect(totals.walletDeduction).toBe(300);
        expect(totals.finalPayable).toBe(0);
    });

    it('never lets a discount go past the price', () => {
        expect(campTotals({ price: 400, discountAmount: 900 }).finalPayable).toBe(0);
    });

    it('treats nonsense as zero rather than negative money', () => {
        expect(campTotals({ price: -5, discountAmount: -5, walletBalance: -5, useWallet: true }).finalPayable).toBe(0);
    });
});

describe('campSummaryLines', () => {
    it('shows only the base price when nothing is applied', () => {
        expect(campSummaryLines(campTotals({ price: 499 }))).toEqual([
            { key: 'price', label: 'Base Price', value: '₹499', tone: 'plain' },
        ]);
    });

    it('adds a discount and a wallet row when they apply', () => {
        const lines = campSummaryLines(campTotals({ price: 1000, discountAmount: 200, walletBalance: 100, useWallet: true }));
        expect(lines.map((l) => [l.key, l.value])).toEqual([
            ['price', '₹1,000'],
            ['discount', '-₹200'],
            ['wallet', '-₹100'],
        ]);
    });
});

describe('campPayCta', () => {
    it('uses the website wording', () => {
        expect(campPayCta(0)).toBe('Register for Free');
        expect(campPayCta(499)).toBe('Pay & Register ₹499');
    });
});
