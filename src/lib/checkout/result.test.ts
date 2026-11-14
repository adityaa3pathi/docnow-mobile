import { describe, expect, it } from 'vitest';

import { dueLine, keepPolling, POLL_FOR_MS, resultView, viewFor } from './result';

describe('resultView', () => {
    it('confirms a booking the server confirmed', () => {
        const view = resultView('confirmed', false);
        expect(view.title).toBe('Booking confirmed');
        expect(view.showNextSteps).toBe(true);
        expect(view.showBackToCart).toBe(false);
    });

    it('says the payment is in and the lab is still being asked', () => {
        const view = resultView('pending', false);
        expect(view.title).toBe('Confirming your booking');
        expect(view.body).toContain('Your payment is received');
    });

    it('does not claim a payment for a pay-at-collection order', () => {
        const view = resultView('pending', true);
        expect(view.body).toContain('Your order is placed');
        expect(view.body).not.toContain('payment is received');
    });

    it('says nothing was charged when a pay-at-collection order is refunded', () => {
        expect(resultView('refunded', true).body).toContain('Nothing was charged');
        expect(resultView('refunded', false).body).toContain('refunded you');
    });

    it('offers the cart back only when no booking was made', () => {
        expect(resultView('not_paid', false).showBackToCart).toBe(true);
        expect(resultView('not_paid', false).showNextSteps).toBe(false);
    });

    it('never uses an exclamation mark', () => {
        for (const outcome of ['confirmed', 'pending', 'refunded', 'not_paid'] as const) {
            const view = resultView(outcome, false);
            expect(`${view.title} ${view.body}`).not.toContain('!');
        }
    });
});

describe('dueLine', () => {
    it('tells the person what the collector will take', () => {
        expect(dueLine(true, 'confirmed', 379)).toBe('Please pay ₹379 to the sample collector at your visit (cash or UPI).');
        expect(dueLine(true, 'pending', 379)).toContain('₹379');
    });

    it('stays quiet for an online order, a settled order or nothing due', () => {
        expect(dueLine(false, 'confirmed', 379)).toBeNull();
        expect(dueLine(true, 'refunded', 379)).toBeNull();
        expect(dueLine(true, 'confirmed', 0)).toBeNull();
    });
});

describe('keepPolling', () => {
    it('keeps asking while the server says pending', () => {
        expect(keepPolling(null, false)).toBe(true);
        expect(keepPolling('pending', false)).toBe(true);
    });

    it('stops as soon as the outcome is settled', () => {
        expect(keepPolling('confirmed', false)).toBe(false);
        expect(keepPolling('refunded', false)).toBe(false);
        expect(keepPolling('not_paid', false)).toBe(false);
    });

    it('gives up once the wait is over', () => {
        expect(keepPolling('pending', true)).toBe(false);
        expect(keepPolling(null, true)).toBe(false);
        expect(POLL_FOR_MS).toBe(180_000);
    });
});

describe('viewFor', () => {
    it('shows the server outcome once it arrives', () => {
        expect(viewFor('confirmed', true)).toBe('confirmed');
    });

    it('waits rather than claiming success before the first reply', () => {
        expect(viewFor(null, true)).toBe('pending');
    });

    it('claims nothing at all without a booking to read', () => {
        expect(viewFor(null, false)).toBe('not_paid');
    });
});
