/**
 * One idempotency key per intended camp registration. A retried tap, or a retry after the app was
 * killed mid-payment, reuses it so the server returns the same booking instead of making a second.
 */
import type { AsyncStore } from '@/lib/consult/bookingFlow';
import { sanitizeKey } from '@/lib/consult/idempotency';

const PREFIX = 'camp-attempt:';

export function campAttemptName(campId: string, patientId: string): string {
    return `${PREFIX}${campId}:${patientId}`;
}

/** The id generator is passed in so tested files never load the native crypto module. */
export async function campAttemptKey(
    campId: string,
    patientId: string,
    store: AsyncStore | null,
    makeId: () => string,
): Promise<string> {
    const name = campAttemptName(campId, patientId);
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

export async function forgetCampAttempt(campId: string, patientId: string, store: AsyncStore | null) {
    try {
        await store?.removeItem(campAttemptName(campId, patientId));
    } catch {
        // Nothing to forget.
    }
}
