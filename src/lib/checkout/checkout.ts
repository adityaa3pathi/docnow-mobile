/**
 * The checkout rules, ported from the website's useCheckout. Pure, so the screen only wires up
 * calls and navigation. No amount is ever put in a request: the server prices the order.
 */
import type { CartItem } from '@/lib/cart';

import type { CheckoutPaymentMethod, InitiateReply, MissingProfileFields } from './types';

export interface InitiateInput {
    /** The lab partner's slot id (stm_id), not our own. */
    slotId: string;
    slotLabel: string;
    slotDate: string;
    addressId: string;
    promoCode?: string | null;
    useWallet: boolean;
    /** Whose name goes on the invoice. 'self' means the account holder, which is the default. */
    billingPatientId?: string | null;
    paymentMethod: CheckoutPaymentMethod;
}

/** Exactly the fields the website sends. The promo code is a code, never a discount. */
export function initiateBody(input: InitiateInput) {
    return {
        slot_id: input.slotId,
        slotLabel: input.slotLabel,
        slotDate: input.slotDate,
        addressId: input.addressId,
        promoCode: input.promoCode || undefined,
        useWallet: Boolean(input.useWallet),
        billingPatientId: input.billingPatientId && input.billingPatientId !== 'self' ? input.billingPatientId : undefined,
        paymentMethod: input.paymentMethod,
    };
}

export const PAY_ON_COLLECTION = 'PAY_ON_COLLECTION';

export type CheckoutStep =
    | { kind: 'pay_on_collection'; bookingId: string; amount: number }
    | { kind: 'confirmed'; bookingId: string }
    | { kind: 'razorpay'; bookingId: string; orderId: string; keyId: string; amountPaise: number }
    | { kind: 'unexpected' };

/**
 * What to do with an initiate reply. Pay on collection and a zero amount are already placed, so
 * only an online order with something to pay opens native checkout.
 */
export function nextStep(reply: InitiateReply): CheckoutStep {
    const bookingId = reply.bookingId;
    if (!bookingId) return { kind: 'unexpected' };
    if (reply.paymentMethod === PAY_ON_COLLECTION) {
        return { kind: 'pay_on_collection', bookingId, amount: reply.amount ?? 0 };
    }
    if (reply.status === 'confirmed' || reply.amount === 0) return { kind: 'confirmed', bookingId };
    if (reply.razorpayOrderId && reply.keyId && (reply.amount ?? 0) > 0) {
        return { kind: 'razorpay', bookingId, orderId: reply.razorpayOrderId, keyId: reply.keyId, amountPaise: reply.amount! };
    }
    // Payment received but the booking is still being confirmed, so the result screen takes over.
    if (reply.status) return { kind: 'confirmed', bookingId };
    return { kind: 'unexpected' };
}

export type VerifiedOutcome = 'confirmed' | 'refunded' | 'pending';

/** The verify reply only ever moves the person on; the result screen reads the real outcome. */
export function verifiedOutcome(status?: string): VerifiedOutcome {
    if (status === 'confirmed' || status === 'already_confirmed') return 'confirmed';
    if (status === 'refunded_due_to_partner_error') return 'refunded';
    return 'pending';
}

export type InitiateProblem =
    | { kind: 'profile_incomplete'; missing: MissingProfileFields }
    | { kind: 'disabled_items'; items: { testCode: string; testName: string }[]; message: string }
    | { kind: 'message'; message: string };

export interface InitiateErrorBody {
    code?: string;
    error?: string;
    missingFields?: MissingProfileFields;
    disabledItems?: { testCode: string; testName: string }[];
}

/** Sorts a failed initiate into the three things the screen can do about it. */
export function initiateProblem(body: InitiateErrorBody | undefined, fallback: string): InitiateProblem {
    if (body?.code === 'PROFILE_INCOMPLETE') {
        return { kind: 'profile_incomplete', missing: body.missingFields ?? { name: true, gender: true, age: true } };
    }
    if (body?.code === 'DISABLED_ITEMS') {
        return {
            kind: 'disabled_items',
            items: body.disabledItems ?? [],
            message: body.error ?? 'Some tests in your cart are not available. Please remove them to continue.',
        };
    }
    return { kind: 'message', message: body?.error || fallback };
}

export interface ReadinessInput {
    addressId: string;
    date: string;
    time: string;
    locked: boolean;
    freezing: boolean;
}

/** The one thing still missing before checkout, or null when the order can be placed. */
export function checkoutHint(input: ReadinessInput): string | null {
    if (!input.addressId) return 'Choose a collection address to continue.';
    if (!input.date || !input.time) return 'Choose a collection date and time.';
    if (!input.locked) return 'Lock the slot to continue.';
    return null;
}

export function checkoutReady(input: ReadinessInput): boolean {
    return checkoutHint(input) === null && !input.freezing;
}

/** Treats a line with no person as the account holder, which is what the server does. */
export function personKey(item: Pick<CartItem, 'patientId'>): string {
    return item.patientId || 'self';
}

/** The first line the lab would refuse: the same test twice for the same person. */
export function duplicateAssignment(items: CartItem[]): CartItem | null {
    const seen = new Set<string>();
    for (const item of items) {
        const key = `${item.testCode}:${personKey(item)}`;
        if (seen.has(key)) return item;
        seen.add(key);
    }
    return null;
}

export function duplicateMessage(item: CartItem): string {
    return `${item.testName} is assigned to the same person twice. Please choose another person or remove one of them.`;
}

/** Which cart lines a failed availability check named, so their cards can say so. */
export function unavailableCodes(unavailable?: { testCode: string }[]): string[] {
    return (unavailable ?? []).map((row) => row.testCode);
}

export function unavailableMessage(unavailable: { testName: string }[]): string {
    if (unavailable.length === 1) {
        return `${unavailable[0].testName} is not available at your address. Please remove it to continue.`;
    }
    return 'Some tests are not available at your address. Please remove them to continue.';
}

// Native checkout closing says nothing certain about the money, so neither do these.
export const DISMISSED_MESSAGE =
    'The payment screen closed before the payment finished. You can try again while the slot hold lasts.';
export const PAYMENT_FAILED_MESSAGE =
    'That payment did not complete. Please try again, or use another method. If money was taken, it will show in your lab bookings.';
export const COULD_NOT_OPEN_MESSAGE = 'We could not open the payment screen. Please try again.';

/** What to tell the person when native checkout ended without a payment to verify. */
export function paymentOutcomeMessage(kind: 'dismissed' | 'failed' | 'could_not_open'): string {
    if (kind === 'dismissed') return DISMISSED_MESSAGE;
    if (kind === 'could_not_open') return COULD_NOT_OPEN_MESSAGE;
    return PAYMENT_FAILED_MESSAGE;
}
