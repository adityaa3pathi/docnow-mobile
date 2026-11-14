import { describe, expect, it } from 'vitest';

import { campCheckoutBody, campHint, campProblem, campReady, nextCampStep } from './registration';

const today = new Date(2026, 10, 14);

describe('campCheckoutBody', () => {
    it('sends the four fields the website sends, and no amount', () => {
        expect(
            campCheckoutBody({ campId: 'c1', patientId: 'p1', dob: '1990-01-01', promoCode: 'SAVE10', useWallet: true }),
        ).toEqual({ campId: 'c1', patientId: 'p1', dob: '1990-01-01', promoCode: 'SAVE10', useWallet: true });
    });

    it('leaves an empty promo code out instead of sending a blank one', () => {
        const body = campCheckoutBody({ campId: 'c1', patientId: 'p1', dob: '1990-01-01', promoCode: '', useWallet: false });
        expect(body.promoCode).toBeUndefined();
        expect(body.useWallet).toBe(false);
    });
});

describe('campHint', () => {
    it('asks for a patient first', () => {
        expect(campHint({ patientId: '', dob: '' }, today)).toBe('Select a patient to continue');
    });

    it('then asks for a date of birth', () => {
        expect(campHint({ patientId: 'p1', dob: '' }, today)).toBe('Enter date of birth to continue');
    });

    it('refuses a date of birth in the future', () => {
        expect(campHint({ patientId: 'p1', dob: '2030-01-01' }, today)).toBe('That date of birth cannot be in the future');
    });

    it('is happy with a patient and a past date', () => {
        expect(campHint({ patientId: 'p1', dob: '1990-01-01' }, today)).toBeNull();
        expect(campReady({ patientId: 'p1', dob: '1990-01-01' }, today)).toBe(true);
    });

    it('accepts today as a date of birth', () => {
        expect(campReady({ patientId: 'p1', dob: '2026-11-14' }, today)).toBe(true);
    });
});

describe('nextCampStep', () => {
    it('opens native checkout when there is something to pay', () => {
        expect(
            nextCampStep({ bookingId: 'b1', razorpayOrderId: 'order_1', keyId: 'rzp_test', amount: 49900 }),
        ).toEqual({ kind: 'razorpay', bookingId: 'b1', orderId: 'order_1', keyId: 'rzp_test', amountPaise: 49900 });
    });

    it('treats a zero-amount reply as already registered', () => {
        expect(nextCampStep({ bookingId: 'b1', status: 'confirmed', amount: 0 })).toEqual({ kind: 'confirmed', bookingId: 'b1' });
    });

    it('treats a paid-but-pending reply as settled, for the result screen to read', () => {
        expect(nextCampStep({ bookingId: 'b1', status: 'payment_received_booking_pending', amount: 0 })).toEqual({
            kind: 'confirmed',
            bookingId: 'b1',
        });
    });

    it('is unexpected without a booking id', () => {
        expect(nextCampStep({ razorpayOrderId: 'order_1', keyId: 'k', amount: 100 })).toEqual({ kind: 'unexpected' });
    });

    it('is unexpected when an amount is due but no order came back', () => {
        expect(nextCampStep({ bookingId: 'b1', amount: 49900 })).toEqual({ kind: 'unexpected' });
    });
});

describe('campProblem', () => {
    it('asks for the missing profile fields', () => {
        expect(campProblem({ code: 'PROFILE_INCOMPLETE', missingFields: { gender: true } }, 'x')).toEqual({
            kind: 'profile_incomplete',
            missing: { gender: true },
        });
    });

    it('assumes every field is missing when the server named none', () => {
        expect(campProblem({ code: 'PROFILE_INCOMPLETE' }, 'x')).toEqual({
            kind: 'profile_incomplete',
            missing: { name: true, gender: true, age: true },
        });
    });

    it('passes the server message through for a camp that ended or has unavailable tests', () => {
        expect(campProblem({ code: 'CAMP_ENDED', error: 'This camp has ended' }, 'x')).toEqual({
            kind: 'message',
            message: 'This camp has ended',
        });
        expect(campProblem({ code: 'DISABLED_ITEMS', error: 'Some tests in this camp are currently unavailable' }, 'x').kind).toBe('message');
    });

    it('falls back to our own words when the server sent none', () => {
        expect(campProblem(undefined, 'Please try again')).toEqual({ kind: 'message', message: 'Please try again' });
    });
});
