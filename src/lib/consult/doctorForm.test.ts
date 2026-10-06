import { describe, expect, it } from 'vitest';
import { doctorScreen } from './doctorStatus';
import { emptyDoctorForm, splitLanguages, validateDoctorForm, type DoctorFormValues } from './doctorForm';
import { conflictMessage } from './leaveText';
import { istLocalToIso, validateLeave } from './availability';
import { localToPicker, pickerToLocal, pickerToTime, timeToPicker } from './pickerTime';
import type { DoctorMe } from './types';

const valid: DoctorFormValues = {
  displayName: ' Dr Asha Rao ', specialtyId: 'sp1', qualification: 'MBBS', registrationNumber: 'MCI-123',
  registrationCouncil: 'Delhi Medical Council', experienceYears: '12', languages: 'English, Hindi, english, ',
  bio: '  Hello  ', photoUrl: '',
};
const errorsOf = (patch: Partial<DoctorFormValues>) => {
  const r = validateDoctorForm({ ...valid, ...patch });
  return 'errors' in r ? r.errors : {};
};

describe('application form', () => {
  it('returns trimmed values and a split, de-duplicated language list', () => {
    const r = validateDoctorForm(valid);
    expect(r).toEqual({
      input: {
        displayName: 'Dr Asha Rao', specialtyId: 'sp1', qualification: 'MBBS', registrationNumber: 'MCI-123',
        registrationCouncil: 'Delhi Medical Council', experienceYears: 12, languages: ['English', 'Hindi'], bio: 'Hello',
      },
    });
  });
  it('catches each limit with its message', () => {
    expect(errorsOf({ displayName: 'A' }).displayName).toBe('Enter your name.');
    expect(errorsOf({ specialtyId: '' }).specialtyId).toBe('Choose a specialty.');
    expect(errorsOf({ qualification: 'M' }).qualification).toBe('Enter your qualification.');
    expect(errorsOf({ registrationNumber: 'ab' }).registrationNumber).toBe('Enter your registration number.');
    expect(errorsOf({ registrationCouncil: 'x' }).registrationCouncil).toBe('Enter your registration council.');
    for (const bad of ['71', '-1', '1.5', 'abc', '']) expect(errorsOf({ experienceYears: bad }).experienceYears).toBe('Enter whole years, 0 to 70.');
    expect(errorsOf({ experienceYears: '0' }).experienceYears).toBeUndefined();
    expect(errorsOf({ experienceYears: '70' }).experienceYears).toBeUndefined();
    expect(errorsOf({ languages: ' , ' }).languages).toBe('Add at least one language.');
    expect(errorsOf({ languages: 'English, H' }).languages).toBe('Each language needs at least 2 letters.');
    expect(errorsOf({ bio: 'x'.repeat(1001) }).bio).toBe('Keep your bio under 1000 characters.');
    expect(errorsOf({ bio: 'x'.repeat(1000) }).bio).toBeUndefined();
  });
  it('accepts an empty photo address or a full web address only', () => {
    expect(errorsOf({ photoUrl: '' }).photoUrl).toBeUndefined();
    expect(errorsOf({ photoUrl: 'https://example.com/a.jpg' }).photoUrl).toBeUndefined();
    expect(errorsOf({ photoUrl: 'example.com/a.jpg' }).photoUrl).toMatch(/full web address/);
    expect(errorsOf({ photoUrl: 'ftp://example.com/a.jpg' }).photoUrl).toMatch(/full web address/);
  });
  it('starts blank and splits languages', () => {
    expect(emptyDoctorForm().experienceYears).toBe('0');
    expect(splitLanguages('a, ,b')).toEqual(['a', 'b']);
  });
});

describe('doctor screen', () => {
  const me = (status: DoctorMe['status']) => ({ status }) as DoctorMe;
  it('maps each server state to its screen', () => {
    expect(doctorScreen(null)).toBe('apply');
    expect(doctorScreen(undefined)).toBe('apply');
    expect(doctorScreen(me('PENDING'))).toBe('pending');
    expect(doctorScreen(me('REJECTED'))).toBe('rejected');
    expect(doctorScreen(me('SUSPENDED'))).toBe('suspended');
    expect(doctorScreen(me('APPROVED'))).toBe('home');
  });
});

describe('picker time under other time zones', () => {
  it('reads the picker fields as the intended Indian time', () => {
    const d = new Date(2026, 9, 7, 10, 30);
    expect(pickerToLocal(d)).toBe('2026-10-07T10:30');
    expect(pickerToTime(d)).toBe('10:30');
    expect(istLocalToIso('2026-10-07T10:30')).toBe('2026-10-07T05:00:00.000Z');
    expect(pickerToLocal(localToPicker('2026-10-07T10:30')!)).toBe('2026-10-07T10:30');
    expect(pickerToTime(timeToPicker('09:05'))).toBe('09:05');
    expect(localToPicker('nope')).toBeNull();
  });
  it('sends the same instant whatever the phone zone is', () => {
    const original = process.env.TZ;
    const results: string[] = [];
    try {
      for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
        process.env.TZ = tz;
        const d = new Date(2026, 9, 7, 10, 30);
        expect(pickerToLocal(d)).toBe('2026-10-07T10:30');
        results.push(istLocalToIso(pickerToLocal(d))!);
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
    expect(new Set(results)).toEqual(new Set(['2026-10-07T05:00:00.000Z']));
  });
});

describe('leave', () => {
  it('refuses a range that ends at or before its start', () => {
    expect(validateLeave('2026-10-07T10:00', '2026-10-07T10:00')).toEqual({ error: 'The end must be after the start.' });
    expect(validateLeave('2026-10-07T10:00', '2026-10-07T09:00')).toHaveProperty('error');
  });
  it('does not refuse a start in the past', () => {
    expect(validateLeave('2020-01-01T10:00', '2020-01-01T11:00')).toHaveProperty('startsAt');
  });
  it('words the booked conflicts note', () => {
    expect(conflictMessage(0)).toMatch(/No patients were booked/);
    expect(conflictMessage(1)).toMatch(/1 patient has already booked/);
    expect(conflictMessage(3)).toMatch(/3 patients have already booked/);
  });
});
