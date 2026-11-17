import { describe, expect, it } from 'vitest';

import { resolveDefaultId, sortByDefault } from './addresses';

const list = [
    { id: 'a', line1: 'One', city: 'Jaipur', pincode: '302021' },
    { id: 'b', line1: 'Two', city: 'Jaipur', pincode: '302022' },
    { id: 'c', line1: 'Three', city: 'Delhi', pincode: '110001' },
];

describe('resolveDefaultId', () => {
    it('keeps the stored choice while it still exists', () => {
        expect(resolveDefaultId(list, 'b')).toBe('b');
    });

    it('falls back to the first saved address', () => {
        expect(resolveDefaultId(list, 'gone')).toBe('a');
        expect(resolveDefaultId(list, null)).toBe('a');
    });

    it('has no default when nothing is saved', () => {
        expect(resolveDefaultId([], 'b')).toBeNull();
    });
});

describe('sortByDefault', () => {
    it('puts the default first and leaves the rest alone', () => {
        expect(sortByDefault(list, 'c').map((row) => row.id)).toEqual(['c', 'a', 'b']);
        expect(sortByDefault(list, 'a').map((row) => row.id)).toEqual(['a', 'b', 'c']);
    });

    it('copes with an empty list', () => {
        expect(sortByDefault([], 'a')).toEqual([]);
    });
});
