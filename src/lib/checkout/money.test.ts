import { describe, expect, it } from 'vitest';

import {
    collectionFeeNote,
    getCollectionFee,
    itemsTotal,
    orderTotals,
    payableView,
    payAtCollectionAmount,
    SAMPLE_COLLECTION_FEE,
    summaryLines,
} from './money';

const items = (...prices: number[]) => prices.map((price) => ({ price }));

describe('collection fee', () => {
    it('charges the flat fee below the threshold', () => {
        expect(getCollectionFee(499)).toBe(SAMPLE_COLLECTION_FEE);
        expect(getCollectionFee(0)).toBe(SAMPLE_COLLECTION_FEE);
    });

    it('is free at and above the threshold', () => {
        expect(getCollectionFee(500)).toBe(0);
        expect(getCollectionFee(1200)).toBe(0);
    });
});

describe('orderTotals', () => {
    it('adds the fee, then the promo, then the wallet', () => {
        const totals = orderTotals({ items: items(300, 100), discountAmount: 50, walletBalance: 100, useWallet: true });
        expect(totals).toEqual({
            itemsCount: 2,
            itemsTotal: 400,
            collectionFee: 129,
            discountAmount: 50,
            walletDeduction: 100,
            finalPayable: 379,
        });
    });

    it('leaves the wallet out when it is switched off', () => {
        const totals = orderTotals({ items: items(600), walletBalance: 500, useWallet: false });
        expect(totals.walletDeduction).toBe(0);
        expect(totals.finalPayable).toBe(600);
    });

    it('never takes more from the wallet than is payable', () => {
        const totals = orderTotals({ items: items(600), discountAmount: 100, walletBalance: 5000, useWallet: true });
        expect(totals.walletDeduction).toBe(500);
        expect(totals.finalPayable).toBe(0);
    });

    it('does not let a discount push the order below zero', () => {
        const totals = orderTotals({ items: items(600), discountAmount: 900 });
        expect(totals.discountAmount).toBe(600);
        expect(totals.finalPayable).toBe(0);
    });

    it('counts an empty cart as nothing to pay but still charges the fee', () => {
        const totals = orderTotals({ items: [] });
        expect(totals.itemsTotal).toBe(0);
        expect(totals.collectionFee).toBe(129);
    });
});

describe('summaryLines', () => {
    it('says free collection and leaves out the lines the order has not got', () => {
        const lines = summaryLines(orderTotals({ items: items(900) }));
        expect(lines.map((line) => line.key)).toEqual(['items', 'collection']);
        expect(lines[1]).toMatchObject({ value: 'Free', tone: 'free' });
        expect(collectionFeeNote(orderTotals({ items: items(900) }))).toBeNull();
    });

    it('shows the fee, the discount and the wallet when they apply', () => {
        const totals = orderTotals({ items: items(400), discountAmount: 40, walletBalance: 60, useWallet: true });
        const lines = summaryLines(totals);
        expect(lines.map((line) => line.key)).toEqual(['items', 'collection', 'discount', 'wallet']);
        expect(lines[2].value).toBe('-₹40');
        expect(lines[3].value).toBe('-₹60');
        expect(collectionFeeNote(totals)).toBe('Free collection on orders above ₹500');
    });

    it('formats the items count and the amounts in rupees', () => {
        const lines = summaryLines(orderTotals({ items: items(1200, 300) }));
        expect(lines[0]).toMatchObject({ label: 'Items (2)', value: '₹1,500' });
    });
});

describe('payable', () => {
    it('drops the paisa at collection so nothing extra is charged', () => {
        expect(payAtCollectionAmount(379.6)).toBe(379);
        expect(payAtCollectionAmount(-5)).toBe(0);
    });

    it('reads as pay at collection when the collector takes the money', () => {
        expect(payableView(379.6, true)).toEqual({ label: 'Pay at collection', amount: '₹379', cta: 'Place order' });
    });

    it('puts the amount on the online button', () => {
        expect(payableView(379, false)).toEqual({ label: 'Total payable', amount: '₹379', cta: 'Pay ₹379' });
    });

    it('places a fully covered order instead of asking for money', () => {
        expect(payableView(0, false).cta).toBe('Place order');
    });
});

describe('itemsTotal', () => {
    it('adds the prices the server fixed', () => {
        expect(itemsTotal(items(10, 20, 30))).toBe(60);
        expect(itemsTotal([])).toBe(0);
    });
});
