import { describe, expect, it } from 'vitest';

import { dobFromPerson, dobKey, formatDob, isDobUsable, parseDobKey } from './dob';

describe('dobKey', () => {
    it('reads the picker\'s own calendar day, not an instant', () => {
        expect(dobKey(new Date(1990, 0, 5))).toBe('1990-01-05');
    });

    it('pads single-digit months and days', () => {
        expect(dobKey(new Date(2001, 8, 9))).toBe('2001-09-09');
    });

    it('survives a late-evening local time that would be tomorrow in UTC', () => {
        expect(dobKey(new Date(1990, 0, 5, 23, 59))).toBe('1990-01-05');
    });
});

describe('parseDobKey', () => {
    it('round-trips a key', () => {
        expect(dobKey(parseDobKey('1990-01-05')!)).toBe('1990-01-05');
    });

    it('refuses anything that is not a plain date', () => {
        expect(parseDobKey('05/01/1990')).toBeNull();
        expect(parseDobKey('1990-01-05T00:00:00Z')).toBeNull();
        expect(parseDobKey('')).toBeNull();
    });
});

describe('dobFromPerson', () => {
    it('keeps only the date part of a saved timestamp', () => {
        expect(dobFromPerson('1990-01-05T00:00:00.000Z')).toBe('1990-01-05');
    });

    it('is empty for a person with no date of birth', () => {
        expect(dobFromPerson(null)).toBe('');
        expect(dobFromPerson(undefined)).toBe('');
        expect(dobFromPerson('rubbish')).toBe('');
    });
});

describe('formatDob', () => {
    it('reads as a plain date', () => {
        expect(formatDob('1990-01-05')).toBe('5 Jan 1990');
    });

    it('is empty rather than wrong for a bad key', () => {
        expect(formatDob('nope')).toBe('');
    });
});

describe('isDobUsable', () => {
    const today = new Date(2026, 10, 14);

    it('accepts a past date and today', () => {
        expect(isDobUsable('1990-01-05', today)).toBe(true);
        expect(isDobUsable('2026-11-14', today)).toBe(true);
    });

    it('refuses tomorrow and anything unreadable', () => {
        expect(isDobUsable('2026-11-15', today)).toBe(false);
        expect(isDobUsable('', today)).toBe(false);
    });
});
