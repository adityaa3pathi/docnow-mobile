import { describe, expect, it } from 'vitest';

import { callStage, canWrite, cartLines, isAudioRole, notesLock, parseFollowUp } from './roomText';

describe('call roles', () => {
  it('treats only the -audio roles as audio only', () => {
    expect(isAudioRole('doctor-audio')).toBe(true);
    expect(isAudioRole('patient-audio')).toBe(true);
    expect(isAudioRole('doctor')).toBe(false);
    expect(isAudioRole('patient')).toBe(false);
  });
});

describe('call stage', () => {
  it('shows connecting until LiveKit says connected', () => {
    expect(callStage('connecting', false)).toEqual({ stage: 'connecting', reconnecting: false });
    expect(callStage('disconnected', true)).toEqual({ stage: 'connecting', reconnecting: false });
  });
  it('waits for the other person, then shows them', () => {
    expect(callStage('connected', false)).toEqual({ stage: 'waiting', reconnecting: false });
    expect(callStage('connected', true)).toEqual({ stage: 'live', reconnecting: false });
  });
  it('keeps the call on screen while reconnecting', () => {
    expect(callStage('reconnecting', true)).toEqual({ stage: 'live', reconnecting: true });
    expect(callStage('signalReconnecting', false)).toEqual({ stage: 'waiting', reconnecting: true });
  });
});

describe('notes lock', () => {
  it('opens notes only once the call has started', () => {
    expect(canWrite('IN_PROGRESS')).toBe(true);
    expect(canWrite('COMPLETED')).toBe(true);
    expect(canWrite('WAITING')).toBe(false);
    expect(notesLock({ status: 'CONFIRMED', prescription: null })).toBe('Notes open once the call has started.');
    expect(notesLock({ status: 'IN_PROGRESS', prescription: null })).toBeNull();
  });
  it('locks notes after the prescription is issued', () => {
    expect(notesLock({ status: 'COMPLETED', prescription: { id: 'p1' } })).toBe('Notes are locked because the prescription has been issued.');
  });
});

describe('cart result', () => {
  const tests = [{ code: 'CBC', name: 'Complete blood count' }, { code: 'TSH', name: 'Thyroid' }];
  it('names added tests and says where the cart is', () => {
    expect(cartLines({ added: ['CBC', 'TSH'], skipped: [] }, tests)).toEqual(['Added to your cart on docnow.in: Complete blood count, Thyroid.']);
  });
  it('lists skipped tests with the reason, falling back to the code', () => {
    expect(cartLines({ added: [], skipped: [{ code: 'CBC', reason: 'Already in cart' }, { code: 'X1', reason: 'Not available' }] }, tests))
      .toEqual(['Complete blood count: Already in cart', 'X1: Not available']);
  });
  it('says so when nothing came back', () => {
    expect(cartLines({ added: [], skipped: [] }, tests)).toEqual(['There were no tests to add.']);
  });
});

describe('follow-up days', () => {
  it('is empty when blank and a number when whole and in range', () => {
    expect(parseFollowUp('  ')).toBeNull();
    expect(parseFollowUp(' 7 ')).toBe(7);
    expect(parseFollowUp('365')).toBe(365);
  });
  it('rejects fractions, zero, over a year and words', () => {
    for (const bad of ['1.5', '0', '366', 'two', '-3']) expect(parseFollowUp(bad)).toBeUndefined();
  });
});
