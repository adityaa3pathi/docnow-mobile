import { describe, expect, it } from 'vitest';
import type { AsyncStore } from './bookingFlow';
import { attemptKey, forgetAttemptKey } from './idempotency';

function memory(): AsyncStore {
    const m = new Map<string, string>();
    return {
        getItem: async (k) => m.get(k) ?? null,
        setItem: async (k, v) => void m.set(k, v),
        removeItem: async (k) => void m.delete(k),
    };
}

let n = 0;
const makeId = () => `id-${++n}-1234-5678`;

describe('attemptKey', () => {
    it('reuses the key for the same slot and person, and differs for another', async () => {
        const s = memory();
        const a = await attemptKey('slot-1', 'person-1', s, makeId);
        expect(await attemptKey('slot-1', 'person-1', s, makeId)).toBe(a);
        expect(await attemptKey('slot-2', 'person-1', s, makeId)).not.toBe(a);
        expect(await attemptKey('slot-1', 'person-2', s, makeId)).not.toBe(a);
    });
    it('makes a fresh key after the old one is forgotten', async () => {
        const s = memory();
        const a = await attemptKey('slot-1', 'person-1', s, makeId);
        await forgetAttemptKey('slot-1', 'person-1', s);
        expect(await attemptKey('slot-1', 'person-1', s, makeId)).not.toBe(a);
    });
    it('makes keys the server accepts, capped at 64 characters', async () => {
        expect(await attemptKey('s', 'p', memory(), () => 'a-b-c-d-1234')).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
        const long = await attemptKey('s', 'p', memory(), () => 'x'.repeat(200) + '!!');
        expect(long).toHaveLength(64);
    });
    it('returns a fresh key and does not throw when storage fails', async () => {
        const broken: AsyncStore = {
            getItem: async () => { throw new Error('x'); },
            setItem: async () => { throw new Error('x'); },
            removeItem: async () => { throw new Error('x'); },
        };
        expect(await attemptKey('s', 'p', broken, makeId)).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
        expect(await attemptKey('s', 'p', null, makeId)).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
        await expect(forgetAttemptKey('s', 'p', broken)).resolves.toBeUndefined();
    });
});
