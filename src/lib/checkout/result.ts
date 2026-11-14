/**
 * The result screen's wording, ported from the website's thank-you page so both say the same
 * thing about the same outcome. The server's outcome decides it; nothing here guesses.
 */
import { formatRupees } from '@/lib/consult/format';
import type { CheckoutOutcome } from '@/lib/lab/types';

export const POLL_EVERY_MS = 5_000;
export const POLL_FOR_MS = 3 * 60_000;

export type ResultTone = 'success' | 'warning' | 'danger' | 'muted';

export interface ResultView {
    title: string;
    body: string;
    tone: ResultTone;
    /** The three collection steps only make sense while a booking is alive. */
    showNextSteps: boolean;
    showBackToCart: boolean;
}

const VIEWS: Record<CheckoutOutcome, ResultView> = {
    confirmed: {
        title: 'Booking confirmed',
        body: 'Your health test booking has been placed.',
        tone: 'success',
        showNextSteps: true,
        showBackToCart: false,
    },
    pending: {
        title: 'Confirming your booking',
        body: 'Your payment is received. We are confirming the slot with the lab, and this screen updates by itself.',
        tone: 'warning',
        showNextSteps: true,
        showBackToCart: false,
    },
    refunded: {
        title: 'We could not book this test',
        body: 'The lab could not take this booking, so we have refunded you. Card refunds reach your account in 5 to 7 working days, and wallet money is back now.',
        tone: 'danger',
        showNextSteps: false,
        showBackToCart: false,
    },
    not_paid: {
        title: 'Payment not completed',
        body: 'No booking was made. If money left your account, your bank returns it automatically. Your cart is still saved.',
        tone: 'muted',
        showNextSteps: false,
        showBackToCart: true,
    },
};

// Pay at collection: nothing was paid yet, so "payment received" and "refunded" read differently.
const PAY_AT_COLLECTION_BODY: Partial<Record<CheckoutOutcome, string>> = {
    pending: 'Your order is placed. We are confirming the slot with the lab, and this screen updates by itself.',
    refunded: 'The lab could not take this booking. Nothing was charged, and any wallet money you used is back in your wallet.',
};

export function resultView(outcome: CheckoutOutcome, payAtCollection: boolean): ResultView {
    const base = VIEWS[outcome];
    const body = (payAtCollection && PAY_AT_COLLECTION_BODY[outcome]) || base.body;
    return { ...base, body };
}

/** What the collector will take at the visit, or null when there is nothing left to pay. */
export function dueLine(payAtCollection: boolean, outcome: CheckoutOutcome, amountDue: number): string | null {
    if (!payAtCollection || amountDue <= 0) return null;
    if (outcome !== 'confirmed' && outcome !== 'pending') return null;
    return `Please pay ${formatRupees(amountDue)} to the sample collector at your visit (cash or UPI).`;
}

export const SLOW_NOTE =
    'This is taking longer than usual. We will message you on WhatsApp once it is confirmed, or refund you if it cannot be booked.';

export interface NextStep {
    title: string;
    body: string;
}

export const NEXT_STEPS: NextStep[] = [
    {
        title: 'A sample collector is assigned',
        body: 'A trained collector is assigned to your booking. You get an SMS and a WhatsApp message with the details.',
    },
    {
        title: 'Collection at your address',
        body: 'The collector arrives at your address during the slot you chose, with sealed single-use kits.',
    },
    {
        title: 'Reports in 24 to 48 hours',
        body: 'Your samples are processed at accredited labs. Verified reports reach your phone and your DocNow account.',
    },
];

/** Polling stops as soon as the server settles on anything other than pending, or after the wait. */
export function keepPolling(outcome: CheckoutOutcome | null, waitedTooLong: boolean): boolean {
    if (outcome !== null && outcome !== 'pending') return false;
    return !waitedTooLong;
}

/** Without a booking to read, the screen stays neutral rather than claiming success. */
export function viewFor(outcome: CheckoutOutcome | null, hasBooking: boolean): CheckoutOutcome {
    if (outcome) return outcome;
    return hasBooking ? 'pending' : 'not_paid';
}
