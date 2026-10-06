import { describe, expect, it } from 'vitest';
import { doctorStatusLabel, groupByIstDay, mergePages } from './doctorConsultations';
import type { DoctorConsultation } from './types';

const row = (id: string, startsAt: string): DoctorConsultation => ({
  id, startsAt, endsAt: new Date(Date.parse(startsAt) + 15 * 60_000).toISOString(), status: 'CONFIRMED', type: 'VIDEO', patientName: 'A',
});

describe('merging pages', () => {
  it('keeps one copy of a booking that appears on two pages', () => {
    const a = row('a', '2026-10-07T04:00:00Z');
    const b = row('b', '2026-10-07T05:00:00Z');
    const c = row('c', '2026-10-07T06:00:00Z');
    expect(mergePages([{ items: [a, b] }, { items: [b, c] }]).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(mergePages([])).toEqual([]);
  });
});

describe('grouping by Indian day', () => {
  it('puts 23:30 IST on its own Indian day even when the phone is set to UTC', () => {
    const original = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      // 18:00Z is 23:30 IST on 7 Oct; 19:00Z is 00:30 IST on 8 Oct.
      const days = groupByIstDay([row('late', '2026-10-07T18:00:00Z'), row('next', '2026-10-07T19:00:00Z')]);
      expect(days.map((d) => d.key)).toEqual(['2026-10-07', '2026-10-08']);
      expect(days[0].slots.map((s) => s.id)).toEqual(['late']);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
  it('lists newest day first for the past list', () => {
    const days = groupByIstDay([row('new', '2026-10-09T05:00:00Z'), row('old', '2026-10-07T05:00:00Z')], true);
    expect(days.map((d) => d.key)).toEqual(['2026-10-09', '2026-10-07']);
  });
});

describe('doctor status words', () => {
  it('shows a refunded booking as plain Cancelled', () => {
    expect(doctorStatusLabel('REFUNDED').label).toBe('Cancelled');
    expect(doctorStatusLabel('CANCELLED').label).toBe('Cancelled');
    expect(doctorStatusLabel('NO_SHOW_PATIENT').label).toBe('Missed by patient');
  });
});
