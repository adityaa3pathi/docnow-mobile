/**
 * The camp result screen's wording, taken from the website's camp page messages so both say the
 * same thing about the same outcome. The server's outcome decides every word; nothing here guesses.
 */
import type { ResultTone } from '@/lib/checkout';
import type { CheckoutOutcome } from '@/lib/lab/types';

export interface CampResultView {
    title: string;
    body: string;
    tone: ResultTone;
}

const VIEWS: Record<CheckoutOutcome, CampResultView> = {
    confirmed: {
        title: 'Registration confirmed!',
        body: 'Walk in at the camp on any of its dates. Carry a photo ID.',
        tone: 'success',
    },
    pending: {
        title: 'Confirming your registration',
        body: 'Payment received. We are confirming your registration; check My Bookings shortly. This screen updates by itself.',
        tone: 'warning',
    },
    refunded: {
        title: 'We could not register you',
        body: 'We could not register you with the lab, so your payment is being refunded. Card refunds reach your account in 5 to 7 working days, and wallet money is back now.',
        tone: 'danger',
    },
    not_paid: {
        title: 'Payment not completed',
        body: 'No registration was made. If money left your account, your bank returns it automatically.',
        tone: 'muted',
    },
};

export function campResultView(outcome: CheckoutOutcome): CampResultView {
    return VIEWS[outcome];
}

/** The server's own reason, so nobody hunts for a cancel button that does not exist. */
export const CAMP_NO_CANCEL_NOTE =
    'Camp registrations cannot be cancelled online. Please contact support for assistance.';

/** Shown when verify itself failed, which says nothing about the payment. */
export const CAMP_VERIFY_FAILED =
    'We could not confirm your payment yet. Check My Bookings in a minute; if it is not there, contact support.';
