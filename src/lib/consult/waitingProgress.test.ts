import { describe, expect, it } from 'vitest';

import { timeLeft, waitingProgress } from './waitingRoom';

const start = '2026-10-29T10:00:00.000Z';
const at = (minutesBefore: number) => Date.parse(start) - minutesBefore * 60_000;

describe('waiting room ring', () => {
  it('fills over the 15 minutes before the start', () => {
    expect(waitingProgress(start, at(15))).toBe(0);
    expect(waitingProgress(start, at(7.5))).toBeCloseTo(0.5);
    expect(waitingProgress(start, at(0))).toBe(1);
  });

  it('stays within 0 and 1 outside the lead-up', () => {
    expect(waitingProgress(start, at(30))).toBe(0);
    expect(waitingProgress(start, at(-5))).toBe(1);
  });

  it('shows minutes and seconds left, then nothing once started', () => {
    expect(timeLeft(start, at(12) - 5_000)).toBe('12:05');
    expect(timeLeft(start, at(0))).toBeNull();
  });
});
