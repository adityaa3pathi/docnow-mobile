// Copied from docnowtesting/client/src/lib/consult/availability.test.ts
import { describe, expect, it } from 'vitest';
import { emptyWeek, isoToIstLocal, istLocalToIso, rangesOverlap, validateLeave, validateWeek, windowsToForm } from './availability';

describe('weekly hours', () => {
    it('saves 10:00-14:00 as 600-840 and reads it back', () => {
        const week = emptyWeek();
        week[1] = [{ start: '10:00', end: '14:00' }];
        const { errors, windows } = validateWeek(week);
        expect(errors).toEqual({});
        expect(windows).toEqual([{ dayOfWeek: 1, startMinute: 600, endMinute: 840 }]);
        expect(windowsToForm(windows)[1]).toEqual([{ start: '10:00', end: '14:00' }]);
    });
    it('refuses overlapping ranges and allows adjacent ones', () => {
        expect(rangesOverlap({ start: '10:00', end: '12:00' }, { start: '11:00', end: '13:00' })).toBe(true);
        expect(rangesOverlap({ start: '10:00', end: '12:00' }, { start: '12:00', end: '14:00' })).toBe(false);
        const week = emptyWeek();
        week[2] = [{ start: '10:00', end: '12:00' }, { start: '11:00', end: '13:00' }];
        expect(validateWeek(week).errors[2]).toMatch(/overlap/);
        week[2] = [{ start: '10:00', end: '12:00' }, { start: '12:00', end: '14:00' }];
        expect(validateWeek(week).errors).toEqual({});
    });
    it('refuses bad text and end before start', () => {
        const week = emptyWeek();
        week[0] = [{ start: '9am', end: '10:00' }];
        week[3] = [{ start: '14:00', end: '10:00' }];
        const { errors } = validateWeek(week);
        expect(errors[0]).toBeTruthy();
        expect(errors[3]).toMatch(/after start/);
    });
    it('allows an end of 24:00', () => {
        const week = emptyWeek();
        week[5] = [{ start: '20:00', end: '24:00' }];
        expect(validateWeek(week).windows[0].endMinute).toBe(1440);
    });
});

describe('leave', () => {
    it('reads typed time as Indian time', () => {
        expect(istLocalToIso('2026-10-07T09:00')).toBe('2026-10-07T03:30:00.000Z');
        expect(istLocalToIso('2026-10-07T02:00')).toBe('2026-10-06T20:30:00.000Z');
        expect(isoToIstLocal('2026-10-06T20:30:00.000Z')).toBe('2026-10-07T02:00');
    });
    // Noon IST on 2026-10-07, so the fixtures around it are fixed in time.
    const NOW = Date.parse('2026-10-07T06:30:00.000Z');

    it('refuses an end before the start', () => {
        expect(validateLeave('2026-10-07T10:00', '2026-10-07T09:00', NOW)).toHaveProperty('error');
        expect(validateLeave('2026-10-07T10:00', '', NOW)).toHaveProperty('error');
        expect(validateLeave('2026-10-07T09:00', '2026-10-07T10:00', Date.parse('2026-10-07T00:00:00.000Z'))).toEqual({
            startsAt: '2026-10-07T03:30:00.000Z',
            endsAt: '2026-10-07T04:30:00.000Z',
        });
    });
    it('refuses a range that has already finished', () => {
        expect(validateLeave('2026-10-05T09:00', '2026-10-05T17:00', NOW)).toEqual({
            error: 'That leave has already finished. Pick an end time in the future.',
        });
        // The end exactly at now is already gone from GET /me/leave, which filters on endsAt > now.
        expect(validateLeave('2026-10-07T10:00', '2026-10-07T12:00', NOW)).toHaveProperty('error');
    });
    it('allows a range that started in the past but has not finished', () => {
        expect(validateLeave('2026-10-07T09:00', '2026-10-07T18:00', NOW)).toEqual({
            startsAt: '2026-10-07T03:30:00.000Z',
            endsAt: '2026-10-07T12:30:00.000Z',
        });
    });
});
