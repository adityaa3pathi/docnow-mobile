import { describe, expect, it } from 'vitest';

import { PAY_ON_COLLECTION, amountSummary, dueAtCollection, moneyLines, payOnCollection, paymentLine } from './money';

describe('payment wording', () => {
    it('asks for the collection amount until the collector has taken it', () => {
        const input = { totalAmount: 899, paymentMethod: PAY_ON_COLLECTION, amountDue: 899 };
        expect(paymentLine(input)).toBe('Pay ₹899 at sample collection');
        expect(dueAtCollection(input)).toBe(899);
    });

    it('says it is paid once the collection amount is taken', () => {
        const input = { totalAmount: 899, paymentMethod: PAY_ON_COLLECTION, amountDue: 0 };
        expect(paymentLine(input)).toBe('Paid at sample collection');
        expect(dueAtCollection(input)).toBe(0);
    });

    it('shows the amount the server says is due, not the booking total', () => {
        expect(paymentLine({ totalAmount: 1200, paymentMethod: PAY_ON_COLLECTION, amountDue: 950 })).toBe(
            'Pay ₹950 at sample collection',
        );
    });

    it('never asks for money at collection on an online booking', () => {
        const input = { totalAmount: 899, paymentMethod: 'ONLINE', amountDue: 899, paymentStatus: 'CONFIRMED' };
        expect(payOnCollection(input)).toBe(false);
        expect(dueAtCollection(input)).toBe(0);
        expect(paymentLine(input)).toBe('Paid online');
    });

    it('reads each online payment state plainly', () => {
        expect(paymentLine({ totalAmount: 1, paymentStatus: 'REFUNDED' })).toBe('Refunded');
        expect(paymentLine({ totalAmount: 1, paymentStatus: 'FAILED' })).toBe('Not paid');
        expect(paymentLine({ totalAmount: 1, paymentStatus: 'INITIATED' })).toBe('Payment is being confirmed');
        expect(paymentLine({ totalAmount: 1 })).toBe('Payment is being confirmed');
    });

    it('uses the payment-status outcome when the list status is missing', () => {
        expect(paymentLine({ totalAmount: 1, outcome: 'confirmed' })).toBe('Paid online');
        expect(paymentLine({ totalAmount: 1, outcome: 'not_paid' })).toBe('Not paid');
    });

    it('sums up a list row as amount and payment state', () => {
        expect(amountSummary({ totalAmount: 1499, paymentStatus: 'CONFIRMED' })).toBe('₹1,499 · Paid online');
    });
});

describe('money breakdown', () => {
    it('shows one line when nothing came off the total', () => {
        expect(moneyLines({ totalAmount: 899, paymentStatus: 'CONFIRMED' })).toEqual([
            { label: 'Paid online', value: '₹899', strong: true },
        ]);
    });

    it('lists the discount and the wallet the server reported', () => {
        const lines = moneyLines({
            totalAmount: 1000,
            discountAmount: 100,
            walletAmount: 50,
            finalAmount: 850,
            paymentStatus: 'CONFIRMED',
        });
        expect(lines).toEqual([
            { label: 'Tests total', value: '₹1,000' },
            { label: 'Discount', value: '-₹100' },
            { label: 'Wallet used', value: '-₹50' },
            { label: 'Paid online', value: '₹850', strong: true },
        ]);
    });

    it('leaves out a discount or wallet line the server did not send', () => {
        const labels = moneyLines({ totalAmount: 500, discountAmount: 0, walletAmount: null, paymentStatus: 'CONFIRMED' })
            .map((l) => l.label);
        expect(labels).not.toContain('Discount');
        expect(labels).not.toContain('Wallet used');
    });

    it('closes on the amount still to be taken at collection', () => {
        const lines = moneyLines({
            totalAmount: 1000,
            discountAmount: 100,
            paymentMethod: PAY_ON_COLLECTION,
            amountDue: 900,
        });
        expect(lines.at(-1)).toEqual({ label: 'Pay at sample collection', value: '₹900', strong: true });
    });

    it('closes on what was taken once the collector has been paid', () => {
        const lines = moneyLines({
            totalAmount: 900,
            finalAmount: 900,
            paymentMethod: PAY_ON_COLLECTION,
            amountDue: 0,
        });
        expect(lines.at(-1)).toEqual({ label: 'Paid at sample collection', value: '₹900', strong: true });
    });

    it('does not claim a payment it cannot confirm', () => {
        const lines = moneyLines({ totalAmount: 400, paymentStatus: 'PROCESSING' });
        expect(lines.at(-1)?.label).toBe('Amount being confirmed');
    });
});
