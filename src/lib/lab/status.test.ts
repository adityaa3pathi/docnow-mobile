import { describe, expect, it } from 'vitest';

import {
    LAB_STATUS_MAP,
    bookingActions,
    effectiveBookingStatus,
    extractPartnerCode,
    getJourneyBanner,
    getLabStatusDisplay,
    getLatestReport,
    getReportAction,
    labStatusFor,
} from './status';
import type { LabBooking, LabReportSummary } from './types';

const report = (over: Partial<LabReportSummary> = {}): LabReportSummary => ({
    id: 'r1',
    isFullReport: true,
    fetchStatus: 'STORED',
    verifiedAt: null,
    fileSize: 1024,
    generatedAt: '2026-11-10T06:30:00.000Z',
    ...over,
});

const booking = (over: Partial<LabBooking> = {}): LabBooking => ({
    id: '11111111-1111-1111-1111-111111111111',
    partnerBookingId: 'HL123',
    partnerStatus: 'BS002',
    status: 'Order Booked',
    paymentStatus: 'CONFIRMED',
    slotDate: '2026-11-20',
    slotTime: '09:00 - 11:00',
    totalAmount: 899,
    createdAt: '2026-11-14T06:30:00.000Z',
    items: ['Complete Blood Count'],
    ...over,
});

describe('lab status mapping', () => {
    it('gives every mapped status a label, a tone and a step in range', () => {
        for (const [key, info] of Object.entries(LAB_STATUS_MAP)) {
            expect(info.label.length, key).toBeGreaterThan(0);
            expect(info.message.length, key).toBeGreaterThan(0);
            expect(info.step, key).toBeGreaterThanOrEqual(0);
            expect(info.step, key).toBeLessThanOrEqual(5);
        }
    });

    it('reads our own status text and the partner code the same way', () => {
        expect(getLabStatusDisplay('Sample Collected').label).toBe('Sample collected');
        expect(getLabStatusDisplay('BS007').label).toBe('Sample collected');
    });

    it('keeps the partner code as a support code when it only knows the code', () => {
        const info = getLabStatusDisplay('status BS008 received');
        expect(info.label).toBe('Sample received at lab');
        expect(info.referenceCode).toBe('BS008');
    });

    it('falls back to a plain update for an unknown partner code', () => {
        const info = getLabStatusDisplay(null, undefined, 'BS777');
        expect(info.label).toBe('Update received');
        expect(info.referenceCode).toBe('BS777');
        expect(info.message.toLowerCase()).not.toContain('failed');
    });

    it('treats both spellings of the resample code the same', () => {
        expect(getLabStatusDisplay('BS018').label).toBe(getLabStatusDisplay('BS0018').label);
    });

    it('shows the report as ready once one is stored, whatever the partner says', () => {
        const info = getLabStatusDisplay('BS002', [report()]);
        expect(info.label).toBe('Report ready');
        expect(info.step).toBe(5);
    });

    it('never says a pending report is ready', () => {
        expect(getLabStatusDisplay('BS002', [report({ fetchStatus: 'PENDING' })]).label).toBe('Order booked');
    });

    it('reads a paid camp booking as registered', () => {
        expect(effectiveBookingStatus(booking({ isCampBooking: true, status: 'Order Booked' }))).toBe('Registered');
        expect(effectiveBookingStatus(booking({ isCampBooking: true, paymentStatus: 'INITIATED' }))).toBe('Order Booked');
        expect(labStatusFor(booking({ isCampBooking: true })).label).toBe('Registered');
    });

    it('extracts a partner code only where there is one', () => {
        expect(extractPartnerCode('BS005')).toBe('BS005');
        expect(extractPartnerCode('bs005')).toBe('BS005');
        expect(extractPartnerCode('Sample Collected')).toBeUndefined();
        expect(extractPartnerCode(null)).toBeUndefined();
    });
});

describe('report picking', () => {
    it('prefers a stored full report over a stored partial one', () => {
        const chosen = getLatestReport([
            report({ id: 'partial', isFullReport: false }),
            report({ id: 'full', isFullReport: true }),
        ]);
        expect(chosen?.id).toBe('full');
    });

    it('offers a pending report before a failed one', () => {
        const chosen = getLatestReport([report({ id: 'f', fetchStatus: 'FAILED' }), report({ id: 'p', fetchStatus: 'PENDING' })]);
        expect(chosen?.id).toBe('p');
    });

    it('turns each fetch state into the right action', () => {
        expect(getReportAction(undefined).kind).toBe('none');
        expect(getReportAction([report()]).kind).toBe('view');
        expect(getReportAction([report({ fetchStatus: 'PENDING' })]).kind).toBe('processing');
        expect(getReportAction([report({ fetchStatus: 'FAILED' })]).kind).toBe('retry');
    });
});

describe('journey banner', () => {
    it('uses the server message for a resample', () => {
        const banner = getJourneyBanner({ bookingChangeType: 'RESAMPLED', bookingChangeMessage: 'Please give another sample.' });
        expect(banner).toEqual({ tone: 'warning', title: 'Fresh sample requested', description: 'Please give another sample.' });
    });

    it('explains a changed tracking reference without calling it a new booking', () => {
        const banner = getJourneyBanner({ trackingReferenceUpdated: true });
        expect(banner?.title).toBe('Tracking reference updated');
        expect(banner?.description).toContain('same booking');
    });

    it('shows nothing when nothing changed', () => {
        expect(getJourneyBanner({ bookingChangeType: 'NONE' })).toBeNull();
    });
});

describe('booking actions', () => {
    const actionsFor = (over: Partial<LabBooking>) => {
        const b = booking(over);
        return bookingActions(b, labStatusFor(b));
    };

    it('allows tracking, rescheduling and cancelling a fresh booking', () => {
        const actions = actionsFor({});
        expect(actions).toMatchObject({ canTrack: true, canReschedule: true, canCancel: true, showCollector: false });
        expect(actions.partnerBookingId).toBe('HL123');
    });

    it('stops every action on a cancelled booking', () => {
        const actions = actionsFor({ status: 'Cancelled' });
        expect(actions.canTrack).toBe(false);
        expect(actions.canReschedule).toBe(false);
        expect(actions.canCancel).toBe(false);
    });

    it('stops cancelling and rescheduling once the sample is collected', () => {
        const actions = actionsFor({ status: 'Sample Collected' });
        expect(actions.canCancel).toBe(false);
        expect(actions.canReschedule).toBe(false);
        expect(actions.showCollector).toBe(true);
        expect(actions.canCallCollector).toBe(false);
    });

    it('offers the collector call only while the collector is on the way', () => {
        expect(actionsFor({ status: 'Sample Collector Assigned' }).canCallCollector).toBe(true);
        expect(actionsFor({ status: 'Sample Collector Reached' }).canCallCollector).toBe(true);
    });

    it('offers nothing partner-side on a camp booking', () => {
        const actions = actionsFor({ isCampBooking: true });
        expect(actions).toMatchObject({ canTrack: false, canReschedule: false, canCancel: false, showCollector: false });
    });

    it('does not offer tracking before payment, or without a partner booking', () => {
        expect(actionsFor({ paymentStatus: 'INITIATED' }).canTrack).toBe(false);
        expect(actionsFor({ partnerBookingId: null }).canTrack).toBe(false);
    });

    it('prefers the current partner reference over the original one', () => {
        expect(actionsFor({ currentPartnerBookingId: 'HL999' }).partnerBookingId).toBe('HL999');
    });
});
