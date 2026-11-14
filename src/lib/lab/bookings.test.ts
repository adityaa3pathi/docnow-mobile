import { describe, expect, it } from 'vitest';

import {
    bookingsWithReports,
    formatFileSize,
    formatSlot,
    formatSlotDate,
    groupLabBookings,
    isReadableSlotTime,
    slotDayKey,
} from './bookings';
import type { LabBooking } from './types';

const booking = (over: Partial<LabBooking> = {}): LabBooking => ({
    id: 'b1',
    partnerBookingId: 'HL1',
    status: 'Order Booked',
    paymentStatus: 'CONFIRMED',
    slotDate: '2026-11-20',
    slotTime: '09:00 - 11:00',
    totalAmount: 899,
    createdAt: '2026-11-14T06:30:00.000Z',
    items: ['Complete Blood Count'],
    ...over,
});

const TODAY = '2026-11-14';

describe('slot text', () => {
    it('reads a date the Indian way', () => {
        expect(formatSlotDate('2026-11-20')).toBe('20 Nov 2026');
        expect(formatSlotDate('2026-01-05')).toBe('5 Jan 2026');
    });

    it('takes the day from the date text, so a device time zone cannot shift it', () => {
        expect(slotDayKey('2026-11-20T23:30:00.000Z')).toBe('2026-11-20');
        expect(formatSlotDate('2026-11-20T23:30:00.000Z')).toBe('20 Nov 2026');
    });

    it('hides a slot id that is not a time', () => {
        expect(isReadableSlotTime('09:00 - 11:00')).toBe(true);
        expect(isReadableSlotTime('123456')).toBe(false);
        expect(isReadableSlotTime('')).toBe(false);
        expect(formatSlot(booking({ slotTime: '123456' }))).toBe('20 Nov 2026');
        expect(formatSlot(booking())).toBe('20 Nov 2026, 09:00 - 11:00');
    });
});

describe('grouping bookings', () => {
    it('puts a future slot under upcoming and a finished one under past', () => {
        const groups = groupLabBookings(
            [booking({ id: 'future' }), booking({ id: 'done', status: 'Cancelled' })],
            TODAY,
        );
        expect(groups.upcoming.map((b) => b.id)).toEqual(['future']);
        expect(groups.past.map((b) => b.id)).toEqual(['done']);
    });

    it('treats a slot before today as past even while the journey runs', () => {
        const groups = groupLabBookings([booking({ id: 'old', slotDate: '2026-11-01' })], TODAY);
        expect(groups.past.map((b) => b.id)).toEqual(['old']);
    });

    it('keeps today under upcoming', () => {
        const groups = groupLabBookings([booking({ id: 'today', slotDate: TODAY })], TODAY);
        expect(groups.upcoming.map((b) => b.id)).toEqual(['today']);
    });

    it('counts a booking with a stored report as past', () => {
        const groups = groupLabBookings(
            [
                booking({
                    id: 'reported',
                    reports: [{ id: 'r', isFullReport: true, fetchStatus: 'STORED', verifiedAt: null, fileSize: 1, generatedAt: '2026-11-13T00:00:00.000Z' }],
                }),
            ],
            TODAY,
        );
        expect(groups.past.map((b) => b.id)).toEqual(['reported']);
    });

    it('hides replaced references and says how many', () => {
        const groups = groupLabBookings([booking({ id: 'old', superseded: true }), booking({ id: 'new' })], TODAY);
        expect(groups.hiddenSuperseded).toBe(1);
        expect([...groups.upcoming, ...groups.past].map((b) => b.id)).toEqual(['new']);
    });

    it('sorts upcoming soonest first and past newest first', () => {
        const groups = groupLabBookings(
            [
                booking({ id: 'later', slotDate: '2026-12-01' }),
                booking({ id: 'sooner', slotDate: '2026-11-18' }),
                booking({ id: 'old', slotDate: '2026-10-01', status: 'Cancelled' }),
                booking({ id: 'recent', slotDate: '2026-11-05', status: 'Cancelled' }),
            ],
            TODAY,
        );
        expect(groups.upcoming.map((b) => b.id)).toEqual(['sooner', 'later']);
        expect(groups.past.map((b) => b.id)).toEqual(['recent', 'old']);
    });
});

describe('reports list', () => {
    it('keeps only bookings that have a report, newest slot first', () => {
        const withReport = (id: string, slotDate: string) =>
            booking({
                id,
                slotDate,
                reports: [{ id: `r-${id}`, isFullReport: true, fetchStatus: 'STORED', verifiedAt: null, fileSize: 1, generatedAt: '2026-11-01T00:00:00.000Z' }],
            });
        const rows = bookingsWithReports([booking({ id: 'none' }), withReport('older', '2026-10-01'), withReport('newer', '2026-11-01')]);
        expect(rows.map((b) => b.id)).toEqual(['newer', 'older']);
    });

    it('reads a file size in the nearest unit, and nothing for an unknown one', () => {
        expect(formatFileSize(512)).toBe('512 B');
        expect(formatFileSize(2048)).toBe('2.0 KB');
        expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
        expect(formatFileSize(null)).toBe('');
    });
});
