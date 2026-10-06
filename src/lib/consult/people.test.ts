import { describe, expect, it } from 'vitest';

import { sortPeople, validatePerson } from './people';

describe('validatePerson', () => {
    const ok = { name: 'Asha', relation: 'Parent', age: 60, gender: 'Female' };
    it('accepts a complete form', () => expect(validatePerson(ok)).toBeNull());
    it('asks for a name, a relation and an age of at least 5', () => {
        expect(validatePerson({ ...ok, name: '  ' })).toBe('Please enter a name');
        expect(validatePerson({ ...ok, relation: '' })).toBe('Please select a relation');
        expect(validatePerson({ ...ok, age: 4 })).toBe('Family member must be at least 5 years old');
        expect(validatePerson({ ...ok, age: Number.NaN })).toBe('Family member must be at least 5 years old');
    });
});

describe('sortPeople', () => {
    it('puts Self first, then sorts by name', () => {
        const list = [{ name: 'Zed', relation: 'Friend' }, { name: 'Bob', relation: 'Self' }, { name: 'Amy', relation: 'Child' }];
        expect(sortPeople(list).map((p) => p.name)).toEqual(['Bob', 'Amy', 'Zed']);
    });
});
