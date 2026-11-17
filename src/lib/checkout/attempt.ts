/**
 * One idempotency key per intended checkout. A retried tap, or a retry after the app was killed
 * mid-payment, reuses it so the server returns the same booking instead of making a second one.
 */
import type { AsyncStore } from '@/lib/consult/bookingFlow';
import { sanitizeKey } from '@/lib/consult/idempotency';

const PREFIX = 'checkout-attempt:';

export function attemptName(cartId: string, slotId: string): string {
    return `${PREFIX}${cartId}:${slotId}`;
}

/** The id generator is passed in so tested files never load the native crypto module. */
export async function checkoutAttemptKey(
    cartId: string,
    slotId: string,
    store: AsyncStore | null,
    makeId: () => string,
): Promise<string> {
    const name = attemptName(cartId, slotId);
    try {
        const existing = await store?.getItem(name);
        if (existing) return existing;
    } catch {
        // Storage failed: a fresh key still makes one booking for this attempt.
    }
    const key = sanitizeKey(makeId());
    try {
        await store?.setItem(name, key);
    } catch {
        // The key still works for this attempt.
    }
    return key;
}

export async function forgetCheckoutAttempt(cartId: string, slotId: string, store: AsyncStore | null) {
    try {
        await store?.removeItem(attemptName(cartId, slotId));
    } catch {
        // Nothing to forget.
    }
}
