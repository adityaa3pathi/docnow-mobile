/**
 * The camp registration rules, ported from the website's camp page. Pure, so the screen only
 * wires up calls and navigation. No amount is ever put in a request: the server prices the camp.
 */
import type { MissingProfileFields } from '@/lib/checkout';

import { isDobUsable } from './dob';
import type { CampCheckoutErrorBody, CampCheckoutReply } from './types';

export interface CampCheckoutInput {
    campId: string;
    patientId: string;
    dob: string;
    promoCode?: string | null;
    useWallet: boolean;
}

/** Exactly the four fields the website sends. The promo code is a code, never a discount. */
export function campCheckoutBody(input: CampCheckoutInput) {
    return {
        campId: input.campId,
        patientId: input.patientId,
        dob: input.dob,
        promoCode: input.promoCode || undefined,
        useWallet: Boolean(input.useWallet),
    };
}

export interface CampReadiness {
    patientId: string;
    dob: string;
}

/** The one thing still missing before registering, or null when it can be sent. */
export function campHint(input: CampReadiness, today: Date = new Date()): string | null {
    if (!input.patientId) return 'Select a patient to continue';
    if (!input.dob) return 'Enter date of birth to continue';
    if (!isDobUsable(input.dob, today)) return 'That date of birth cannot be in the future';
    return null;
}

export function campReady(input: CampReadiness, today: Date = new Date()): boolean {
    return campHint(input, today) === null;
}

export type CampStep =
    | { kind: 'confirmed'; bookingId: string }
    | { kind: 'razorpay'; bookingId: string; orderId: string; keyId: string; amountPaise: number }
    | { kind: 'unexpected' };

/**
 * What to do with a checkout reply. A promo or wallet that covers the whole camp is already
 * registered, so only a reply with something left to pay opens native checkout.
 */
export function nextCampStep(reply: CampCheckoutReply): CampStep {
    const bookingId = reply.bookingId;
    if (!bookingId) return { kind: 'unexpected' };
    if (reply.status === 'confirmed' || reply.amount === 0) return { kind: 'confirmed', bookingId };
    if (reply.razorpayOrderId && reply.keyId && (reply.amount ?? 0) > 0) {
        return { kind: 'razorpay', bookingId, orderId: reply.razorpayOrderId, keyId: reply.keyId, amountPaise: reply.amount! };
    }
    // Payment received but the registration is still being confirmed: the result screen takes over.
    if (reply.status) return { kind: 'confirmed', bookingId };
    return { kind: 'unexpected' };
}

export type CampProblem =
    | { kind: 'profile_incomplete'; missing: MissingProfileFields }
    | { kind: 'message'; message: string };

/**
 * Sorts a failed checkout into the two things the screen can do about it. Unlike a cart, a camp's
 * tests cannot be removed, so an unavailable test is only a message.
 */
export function campProblem(body: CampCheckoutErrorBody | undefined, fallback: string): CampProblem {
    if (body?.code === 'PROFILE_INCOMPLETE') {
        return { kind: 'profile_incomplete', missing: body.missingFields ?? { name: true, gender: true, age: true } };
    }
    return { kind: 'message', message: body?.error || fallback };
}
