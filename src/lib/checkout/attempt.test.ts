import { describe, expect, it } from 'vitest';

import type { AsyncStore } from '@/lib/consult/bookingFlow';

import { attemptName, checkoutAttemptKey, forgetCheckoutAttempt } from './attempt';

function store(initial: Record<string, string> = {}): AsyncStore & { map: Record<string, string> } {
    const map = { ...initial };
    return {
        map,
        getItem: async (key) => map[key] ?? null,
        setItem: async (key, value) => {
            map[key] = value;
        },
        removeItem: async (key) => {
            delete map[key];
        },
    };
}

const broken: AsyncStore = {
    getItem: async () => {
        throw new Error('storage gone');
    },
    setItem: async () => {
        throw new Error('storage gone');
    },
    removeItem: async () => {
        throw new Error('storage gone');
    },
};

describe('checkoutAttemptKey', () => {
    it('keeps one key per cart and slot, so a retry does not book twice', async () => {
        const kept = store();
        let made = 0;
        const make = () => `id-${++made}`;
        const first = await checkoutAttemptKey('cart_1', 'stm_9', kept, make);
        const second = await checkoutAttemptKey('cart_1', 'stm_9', kept, make);
        expect(second).toBe(first);
        expect(made).toBe(1);
    });

    it('gives another slot its own key', async () => {
        const kept = store();
        const a = await checkoutAttemptKey('cart_1', 'stm_9', kept, () => 'one');
        const b = await checkoutAttemptKey('cart_1', 'stm_10', kept, () => 'two');
        expect(a).not.toBe(b);
    });

    it('strips anything a header should not carry', async () => {
        const key = await checkoutAttemptKey('cart_1', 'stm_9', store(), () => 'a b/c:d\n');
        expect(key).toBe('k_abcd');
    });

    it('still returns a usable key when storage fails', async () => {
        const key = await checkoutAttemptKey('cart_1', 'stm_9', broken, () => 'abc');
        expect(key).toBe('k_abc');
    });

    it('works with no storage at all', async () => {
        expect(await checkoutAttemptKey('cart_1', 'stm_9', null, () => 'abc')).toBe('k_abc');
    });
});

describe('forgetCheckoutAttempt', () => {
    it('drops the key once the order is placed', async () => {
        const kept = store();
        await checkoutAttemptKey('cart_1', 'stm_9', kept, () => 'one');
        await forgetCheckoutAttempt('cart_1', 'stm_9', kept);
        expect(kept.map[attemptName('cart_1', 'stm_9')]).toBeUndefined();
        const next = await checkoutAttemptKey('cart_1', 'stm_9', kept, () => 'two');
        expect(next).toBe('k_two');
    });

    it('does not throw when storage fails', async () => {
        await expect(forgetCheckoutAttempt('cart_1', 'stm_9', broken)).resolves.toBeUndefined();
    });
});
