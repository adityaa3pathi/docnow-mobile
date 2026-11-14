import { describe, expect, it } from 'vitest';

import {
    campAddress,
    campCityGroups,
    campDateRange,
    campPlace,
    campsCountLabel,
    campStatus,
    parseCampDetail,
    parseCampList,
    testCount,
    testCountLabel,
} from './camps';
import type { ActiveCamp } from './types';

const camp = (over: Partial<ActiveCamp> = {}): ActiveCamp => ({
    id: 'c1',
    name: 'Camp',
    description: null,
    location: 'Town Hall',
    city: 'Pune',
    startDate: '2026-11-20T04:00:00.000Z',
    endDate: '2026-11-22T12:00:00.000Z',
    price: 499,
    ...over,
});

const at = (iso: string) => Date.parse(iso);

describe('campStatus', () => {
    it('says it is happening while the camp is running', () => {
        expect(campStatus(camp().startDate, camp().endDate, at('2026-11-21T06:00:00Z'))).toEqual({
            label: 'Happening Now',
            tone: 'success',
        });
    });

    it('counts the days down inside three days', () => {
        expect(campStatus(camp().startDate, camp().endDate, at('2026-11-18T04:00:00Z')).label).toBe('Starts in 2d');
    });

    it('is upcoming further out', () => {
        expect(campStatus(camp().startDate, camp().endDate, at('2026-11-10T04:00:00Z'))).toEqual({
            label: 'Upcoming',
            tone: 'info',
        });
    });

    it('says ended once the end date has passed', () => {
        expect(campStatus(camp().startDate, camp().endDate, at('2026-11-25T04:00:00Z')).label).toBe('Ended');
    });

    it('does not claim a status for an unreadable date', () => {
        expect(campStatus('not a date', 'nor this').label).toBe('Upcoming');
    });
});

describe('dates and place', () => {
    it('joins a date range', () => {
        expect(campDateRange(camp().startDate, camp().endDate)).toBe('20 Nov 2026 — 22 Nov 2026');
    });

    it('shows one date for a single-day camp', () => {
        expect(campDateRange('2026-11-20T04:00:00Z', '2026-11-20T12:00:00Z')).toBe('20 Nov 2026');
    });

    it('reads the date in India, not in the device zone', () => {
        // 19:00 UTC is already the next day in India.
        expect(campDateRange('2026-11-19T19:00:00Z', '2026-11-19T19:00:00Z')).toBe('20 Nov 2026');
    });

    it('joins the place and the full address', () => {
        expect(campPlace(camp())).toBe('Town Hall, Pune');
        expect(campAddress({ ...camp(), pincode: '411001' })).toBe('Town Hall, Pune, 411001');
    });
});

describe('counts', () => {
    it('counts items from the list reply and from the detail reply', () => {
        expect(testCount(camp({ _count: { items: 4 } }))).toBe(4);
        expect(testCount({ ...camp(), pincode: '1', items: [{ id: 'i', catalogItemId: 'x', catalogItem: { id: 'x', name: 'CBC', partnerCode: 'P', type: 'TEST' } }] })).toBe(1);
    });

    it('counts nothing when the server sent no count', () => {
        expect(testCount(camp())).toBe(0);
    });

    it('labels counts the way the website does', () => {
        expect(testCountLabel(4)).toBe('4 tests included');
        expect(campsCountLabel(1)).toBe('1 active camp available');
        expect(campsCountLabel(3)).toBe('3 active camps available');
    });
});

describe('parsing', () => {
    it('takes a bare array or a wrapped one', () => {
        expect(parseCampList([camp()])).toHaveLength(1);
        expect(parseCampList({ camps: [camp(), camp()] })).toHaveLength(2);
        expect(parseCampList(null)).toEqual([]);
        expect(parseCampList({ error: 'nope' })).toEqual([]);
    });

    it('takes a bare detail or a wrapped one, and always has an items array', () => {
        expect(parseCampDetail({ camp: { ...camp(), pincode: '411001' } })?.items).toEqual([]);
        expect(parseCampDetail({ ...camp(), pincode: '411001' })?.id).toBe('c1');
        expect(parseCampDetail({ error: 'Camp not found' })).toBeNull();
    });
});

describe('campCityGroups', () => {
    it('puts the chosen city first, then the rest A to Z', () => {
        const list = [
            camp({ id: 'a', city: 'Mumbai' }),
            camp({ id: 'b', city: 'Delhi' }),
            camp({ id: 'c', city: 'Pune' }),
        ];
        expect(campCityGroups(list, 'pune').map((g) => g.city)).toEqual(['Pune', 'Delhi', 'Mumbai']);
    });

    it('falls back to A to Z with no city chosen', () => {
        const list = [camp({ id: 'a', city: 'Mumbai' }), camp({ id: 'b', city: 'Delhi' })];
        expect(campCityGroups(list, null).map((g) => g.city)).toEqual(['Delhi', 'Mumbai']);
    });

    it('sorts the camps in a city by start date', () => {
        const list = [
            camp({ id: 'late', startDate: '2026-12-01T00:00:00Z' }),
            camp({ id: 'soon', startDate: '2026-11-15T00:00:00Z' }),
        ];
        expect(campCityGroups(list, 'Pune')[0].camps.map((c) => c.id)).toEqual(['soon', 'late']);
    });

    it('keeps a camp with no city under Other', () => {
        expect(campCityGroups([camp({ city: '  ' })], null)[0].city).toBe('Other');
    });
});
