import { describe, expect, it } from 'vitest';

import {
    formatCountdown,
    holdAnnouncement,
    holdLevel,
    holdMessage,
    lockButtonView,
    secondsLeft,
    shouldRefreeze,
    URGENT_AT_SECONDS,
    WARNING_AT_SECONDS,
} from './hold';

describe('holdLevel', () => {
    it('is none until a slot is locked', () => {
        expect(holdLevel(false, 900)).toBe('none');
    });

    it('is none once the hold has run out', () => {
        expect(holdLevel(true, 0)).toBe('none');
    });

    it('warns at five minutes and turns urgent at two', () => {
        expect(holdLevel(true, WARNING_AT_SECONDS + 1)).toBe('normal');
        expect(holdLevel(true, WARNING_AT_SECONDS)).toBe('warning');
        expect(holdLevel(true, URGENT_AT_SECONDS + 1)).toBe('warning');
        expect(holdLevel(true, URGENT_AT_SECONDS)).toBe('urgent');
        expect(holdLevel(true, 1)).toBe('urgent');
    });
});

describe('formatCountdown', () => {
    it('reads as minutes and padded seconds', () => {
        expect(formatCountdown(900)).toBe('15:00');
        expect(formatCountdown(65)).toBe('1:05');
        expect(formatCountdown(9)).toBe('0:09');
    });

    it('never goes below zero', () => {
        expect(formatCountdown(-10)).toBe('0:00');
    });
});

describe('holdMessage', () => {
    it('matches the level and carries the clock', () => {
        expect(holdMessage('normal', 780)).toBe('Slot held for 13:00.');
        expect(holdMessage('warning', 240)).toBe('Please complete your booking soon. 4:00 left.');
        expect(holdMessage('urgent', 90)).toBe('Your slot is released in 1:30. Please finish paying.');
        expect(holdMessage('none', 0)).toBeNull();
    });

    it('announces once per level rather than every second', () => {
        expect(holdAnnouncement('urgent')).toContain('2 minutes');
        expect(holdAnnouncement('warning')).toContain('5 minutes');
        expect(holdAnnouncement('none')).toBe('');
    });
});

describe('shouldRefreeze', () => {
    it('renews once the hold is inside the last three minutes', () => {
        expect(shouldRefreeze(181, false)).toBe(false);
        expect(shouldRefreeze(180, false)).toBe(true);
        expect(shouldRefreeze(5, false)).toBe(true);
    });

    it('does not ask twice in one cycle, or after it expired', () => {
        expect(shouldRefreeze(100, true)).toBe(false);
        expect(shouldRefreeze(0, false)).toBe(false);
    });
});

describe('secondsLeft', () => {
    it('counts down from the server clock reading', () => {
        expect(secondsLeft(10_000, 1_000)).toBe(9);
        expect(secondsLeft(1_000, 10_000)).toBe(0);
        expect(secondsLeft(null, 1_000)).toBe(0);
    });
});

describe('lockButtonView', () => {
    it('waits for a slot before it can be pressed', () => {
        expect(lockButtonView(false, false, false)).toEqual({ label: 'Lock this slot', busy: false, disabled: true });
        expect(lockButtonView(true, false, false)).toEqual({ label: 'Lock this slot', busy: false, disabled: false });
    });

    it('cannot be pressed while freezing or once locked', () => {
        expect(lockButtonView(true, true, false)).toEqual({ label: 'Locking the slot', busy: true, disabled: true });
        expect(lockButtonView(true, false, true)).toEqual({ label: 'Slot locked', busy: false, disabled: true });
    });
});
