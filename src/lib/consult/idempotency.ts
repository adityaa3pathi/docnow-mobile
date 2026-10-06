// Ported from docnowtesting/client/src/lib/consult/idempotency.ts, async over AsyncStorage.
// One key per booking attempt (slot plus person). A repeat reuses it; a dead booking forgets it.
import type { AsyncStore } from './bookingFlow';

const PREFIX = 'consult-attempt:';

export function sanitizeKey(id: string): string {
    return `k_${id.replace(/[^A-Za-z0-9_-]/g, '')}`.slice(0, 64);
}

/** The random id generator is passed in so tests never load the native crypto module. */
export async function attemptKey(slotId: string, patientId: string, store: AsyncStore | null, makeId: () => string): Promise<string> {
    const name = `${PREFIX}${slotId}:${patientId}`;
    try {
        const existing = await store?.getItem(name);
        if (existing) return existing;
    } catch {
        // Storage failed: fall through to a fresh key.
    }
    const key = sanitizeKey(makeId());
    try {
        await store?.setItem(name, key);
    } catch {
        // The key still works for this attempt.
    }
    return key;
}

export async function forgetAttemptKey(slotId: string, patientId: string, store: AsyncStore | null) {
    try {
        await store?.removeItem(`${PREFIX}${slotId}:${patientId}`);
    } catch {
        // Nothing to forget.
    }
}
