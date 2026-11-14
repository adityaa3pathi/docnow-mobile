import { describe, expect, it, vi } from 'vitest';

import { campAttemptKey, campAttemptName, forgetCampAttempt } from './attempt';

function memoryStore(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem: (k: string) => Promise.resolve(data.get(k) ?? null),
        setItem: (k: string, v: string) => {
            data.set(k, v);
            return Promise.resolve();
        },
        removeItem: (k: string) => {
            data.delete(k);
            return Promise.resolve();
        },
        data,
    };
}

const brokenStore = {
    getItem: () => Promise.reject(new Error('no storage')),
    setItem: () => Promise.reject(new Error('no storage')),
    removeItem: () => Promise.reject(new Error('no storage')),
};

describe('campAttemptName', () => {
    it('is one name per camp and person', () => {
        expect(campAttemptName('c1', 'p1')).toBe('camp-attempt:c1:p1');
        expect(campAttemptName('c1', 'p2')).not.toBe(campAttemptName('c1', 'p1'));
    });
});

describe('campAttemptKey', () => {
    it('reuses the saved key, so a retry cannot make a second booking', async () => {
        const store = memoryStore();
        const makeId = vi.fn(() => 'abc-123');
        const first = await campAttemptKey('c1', 'p1', store, makeId);
        const second = await campAttemptKey('c1', 'p1', store, () => 'different');
        expect(second).toBe(first);
        expect(makeId).toHaveBeenCalledTimes(1);
    });

    it('sanitises the generated id', async () => {
        expect(await campAttemptKey('c1', 'p1', memoryStore(), () => 'a/b c!')).toBe('k_abc');
    });

    it('gives a different key for a different person', async () => {
        const store = memoryStore();
        const one = await campAttemptKey('c1', 'p1', store, () => 'one');
        const two = await campAttemptKey('c1', 'p2', store, () => 'two');
        expect(one).not.toBe(two);
    });

    it('still returns a usable key when storage is broken', async () => {
        expect(await campAttemptKey('c1', 'p1', brokenStore, () => 'abc')).toBe('k_abc');
    });
});

describe('forgetCampAttempt', () => {
    it('drops the key so the next registration is a new one', async () => {
        const store = memoryStore();
        await campAttemptKey('c1', 'p1', store, () => 'one');
        await forgetCampAttempt('c1', 'p1', store);
        expect(await campAttemptKey('c1', 'p1', store, () => 'two')).toBe('k_two');
    });

    it('swallows a storage failure', async () => {
        await expect(forgetCampAttempt('c1', 'p1', brokenStore)).resolves.toBeUndefined();
    });
});
