import { describe, expect, it } from 'vitest';

import type { CartItem } from '@/lib/cart';

import {
    checkoutHint,
    checkoutReady,
    COULD_NOT_OPEN_MESSAGE,
    DISMISSED_MESSAGE,
    duplicateAssignment,
    duplicateMessage,
    initiateBody,
    initiateProblem,
    nextStep,
    PAYMENT_FAILED_MESSAGE,
    paymentOutcomeMessage,
    personKey,
    unavailableCodes,
    unavailableMessage,
    verifiedOutcome,
} from './checkout';

const input = {
    slotId: 'stm_9',
    slotLabel: '07:00 - 08:00',
    slotDate: '2026-11-20',
    addressId: 'addr_1',
    useWallet: true,
    paymentMethod: 'ONLINE' as const,
};

describe('initiateBody', () => {
    it('sends the slot, the address and the choices, and never an amount', () => {
        const body = initiateBody({ ...input, promoCode: 'SAVE50', billingPatientId: 'pat_2' });
        expect(body).toEqual({
            slot_id: 'stm_9',
            slotLabel: '07:00 - 08:00',
            slotDate: '2026-11-20',
            addressId: 'addr_1',
            promoCode: 'SAVE50',
            useWallet: true,
            billingPatientId: 'pat_2',
            paymentMethod: 'ONLINE',
        });
        expect(JSON.stringify(body)).not.toMatch(/amount|price|discount/i);
    });

    it('leaves out an empty promo and treats self as no billing patient', () => {
        const body = initiateBody({ ...input, promoCode: '', billingPatientId: 'self', useWallet: false });
        expect(body.promoCode).toBeUndefined();
        expect(body.billingPatientId).toBeUndefined();
        expect(body.useWallet).toBe(false);
    });

    it('passes pay on collection through as the chosen method', () => {
        expect(initiateBody({ ...input, paymentMethod: 'PAY_ON_COLLECTION' }).paymentMethod).toBe('PAY_ON_COLLECTION');
    });
});

describe('nextStep', () => {
    it('opens native checkout for an online order with something to pay', () => {
        expect(
            nextStep({ bookingId: 'b1', razorpayOrderId: 'order_1', amount: 37_900, keyId: 'rzp_test' }),
        ).toEqual({ kind: 'razorpay', bookingId: 'b1', orderId: 'order_1', keyId: 'rzp_test', amountPaise: 37_900 });
    });

    it('skips payment for pay on collection, which is placed already', () => {
        expect(nextStep({ bookingId: 'b2', paymentMethod: 'PAY_ON_COLLECTION', status: 'confirmed', amount: 379 })).toEqual({
            kind: 'pay_on_collection',
            bookingId: 'b2',
            amount: 379,
        });
    });

    it('skips payment for a zero-amount order', () => {
        expect(nextStep({ bookingId: 'b3', status: 'confirmed', amount: 0 })).toEqual({ kind: 'confirmed', bookingId: 'b3' });
    });

    it('moves a paid but unconfirmed order on to the result screen', () => {
        expect(nextStep({ bookingId: 'b4', status: 'payment_received_booking_pending', amount: 0 })).toEqual({
            kind: 'confirmed',
            bookingId: 'b4',
        });
    });

    it('refuses a reply it cannot act on', () => {
        expect(nextStep({})).toEqual({ kind: 'unexpected' });
        expect(nextStep({ bookingId: 'b5', amount: 500 })).toEqual({ kind: 'unexpected' });
    });
});

describe('verifiedOutcome', () => {
    it('reads the verify reply without deciding the booking itself', () => {
        expect(verifiedOutcome('confirmed')).toBe('confirmed');
        expect(verifiedOutcome('already_confirmed')).toBe('confirmed');
        expect(verifiedOutcome('refunded_due_to_partner_error')).toBe('refunded');
        expect(verifiedOutcome('anything_else')).toBe('pending');
        expect(verifiedOutcome(undefined)).toBe('pending');
    });
});

describe('initiateProblem', () => {
    it('asks for the missing profile fields the server named', () => {
        const problem = initiateProblem(
            { code: 'PROFILE_INCOMPLETE', missingFields: { gender: true, age: true } },
            'fallback',
        );
        expect(problem).toEqual({ kind: 'profile_incomplete', missing: { gender: true, age: true } });
    });

    it('assumes every field is missing when the server did not say', () => {
        const problem = initiateProblem({ code: 'PROFILE_INCOMPLETE' }, 'fallback');
        expect(problem).toEqual({ kind: 'profile_incomplete', missing: { name: true, gender: true, age: true } });
    });

    it('names the switched-off items so their cards can say so', () => {
        const problem = initiateProblem(
            { code: 'DISABLED_ITEMS', error: 'Cart contains unavailable items.', disabledItems: [{ testCode: 'TEST_1', testName: 'CBC' }] },
            'fallback',
        );
        expect(problem).toEqual({
            kind: 'disabled_items',
            items: [{ testCode: 'TEST_1', testName: 'CBC' }],
            message: 'Cart contains unavailable items.',
        });
    });

    it('prefers the server message, then the fallback', () => {
        expect(initiateProblem({ error: 'Promo code expired' }, 'fallback')).toEqual({ kind: 'message', message: 'Promo code expired' });
        expect(initiateProblem(undefined, 'fallback')).toEqual({ kind: 'message', message: 'fallback' });
    });
});

describe('readiness', () => {
    const ready = { addressId: 'a1', date: '2026-11-20', time: '07:00 - 08:00', locked: true, freezing: false };

    it('asks for one thing at a time, in order', () => {
        expect(checkoutHint({ ...ready, addressId: '' })).toBe('Choose a collection address to continue.');
        expect(checkoutHint({ ...ready, time: '' })).toBe('Choose a collection date and time.');
        expect(checkoutHint({ ...ready, locked: false })).toBe('Lock the slot to continue.');
        expect(checkoutHint(ready)).toBeNull();
    });

    it('is not ready while a freeze call is still running', () => {
        expect(checkoutReady(ready)).toBe(true);
        expect(checkoutReady({ ...ready, freezing: true })).toBe(false);
        expect(checkoutReady({ ...ready, locked: false })).toBe(false);
    });
});

const item = (id: string, testCode: string, patientId: string | null): CartItem => ({
    id,
    testCode,
    testName: 'Complete blood count',
    price: 400,
    patientId,
});

describe('duplicateAssignment', () => {
    it('finds the same test given to the same person twice', () => {
        const found = duplicateAssignment([item('1', 'TEST_1', 'p1'), item('2', 'TEST_1', 'p1')]);
        expect(found?.id).toBe('2');
        expect(duplicateMessage(found!)).toContain('same person twice');
    });

    it('treats a line with nobody chosen as the account holder', () => {
        expect(personKey({ patientId: null })).toBe('self');
        expect(duplicateAssignment([item('1', 'TEST_1', null), item('2', 'TEST_1', null)])?.id).toBe('2');
    });

    it('allows the same test for different people', () => {
        expect(duplicateAssignment([item('1', 'TEST_1', 'p1'), item('2', 'TEST_1', 'p2')])).toBeNull();
    });

    it('allows different tests for one person', () => {
        expect(duplicateAssignment([item('1', 'TEST_1', 'p1'), item('2', 'TEST_2', 'p1')])).toBeNull();
    });
});

describe('unavailable items', () => {
    it('lists the codes to flag and names a single test', () => {
        const rows = [{ testCode: 'TEST_1', testName: 'Thyroid profile' }];
        expect(unavailableCodes(rows)).toEqual(['TEST_1']);
        expect(unavailableMessage(rows)).toBe('Thyroid profile is not available at your address. Please remove it to continue.');
    });

    it('stays general for several tests', () => {
        expect(unavailableMessage([{ testName: 'A' }, { testName: 'B' }])).toContain('Some tests');
        expect(unavailableCodes(undefined)).toEqual([]);
    });
});

describe('paymentOutcomeMessage', () => {
    it('separates a closed screen from a failed payment', () => {
        expect(paymentOutcomeMessage('dismissed')).toBe(DISMISSED_MESSAGE);
        expect(paymentOutcomeMessage('failed')).toBe(PAYMENT_FAILED_MESSAGE);
        expect(paymentOutcomeMessage('could_not_open')).toBe(COULD_NOT_OPEN_MESSAGE);
    });

    it('never claims the money is gone', () => {
        expect(DISMISSED_MESSAGE).not.toMatch(/refund/i);
        expect(PAYMENT_FAILED_MESSAGE).toContain('lab bookings');
    });
});
