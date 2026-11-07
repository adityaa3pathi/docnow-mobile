import { describe, expect, it } from 'vitest';

import { arrangeTiles, formatDuration, partyOf, partyOfRole, videoFit } from './callLayout';

const p = (identity: string) => ({ identity });

describe('arrangeTiles', () => {
  it('shows the doctor big for the patient even when family joined first', () => {
    const family = p('caretaker:u1');
    const doctor = p('doctor:d1');
    expect(arrangeTiles([family, doctor], 'patient')).toEqual({ primary: doctor, others: [family] });
  });

  it('shows the patient big for the doctor', () => {
    const family = p('caretaker:u1');
    const patient = p('patient:x');
    expect(arrangeTiles([family, patient], 'doctor')).toEqual({ primary: patient, others: [family] });
  });

  it('falls back to the first person for old identities without a prefix', () => {
    const a = p('abc');
    expect(arrangeTiles([a], 'patient')).toEqual({ primary: a, others: [] });
    expect(arrangeTiles([], 'patient').primary).toBeUndefined();
  });
});

describe('parties', () => {
  it('reads identities and roles', () => {
    expect(partyOf('doctor:1')).toBe('doctor');
    expect(partyOf('nobody')).toBeNull();
    expect(partyOfRole('patient-audio')).toBe('patient');
    expect(partyOfRole('doctor')).toBe('doctor');
  });
});

describe('formatDuration', () => {
  it('pads seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });
});

describe('videoFit', () => {
  it('shows a landscape laptop camera whole in the portrait call area', () => {
    expect(videoFit(1280, 720, 360, 500)).toBe('contain');
    expect(videoFit(720, 1280, 360, 500)).toBe('cover');
  });
});
