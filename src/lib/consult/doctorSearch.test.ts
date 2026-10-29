import { describe, expect, it } from 'vitest';

import { searchDoctors, symptomSpecialties } from './doctorSearch';
import type { DoctorSummary } from './types';

const doc = (id: string, displayName: string, specialty: string, qualification = 'MBBS'): DoctorSummary => ({
  id,
  displayName,
  photoUrl: null,
  qualification,
  experienceYears: 8,
  languages: ['English'],
  bio: null,
  consultationFee: 500,
  slotMinutes: 15,
  specialty: { id: `s-${specialty}`, name: specialty, slug: specialty.toLowerCase().replace(/\s+/g, '-') },
});

const doctors = [
  doc('1', 'Dr. Anjali Mehta', 'General Physician'),
  doc('2', 'Dr. Rohan Kapoor', 'Dermatology', 'MBBS, MD (Dermatology)'),
  doc('3', 'Dr. Sana Iqbal', 'Paediatrics', 'MBBS, DCH'),
];

describe('searchDoctors', () => {
  it('returns everyone for an empty query', () => {
    expect(searchDoctors(doctors, '  ')).toHaveLength(3);
  });

  it('matches name, with or without "Dr"', () => {
    expect(searchDoctors(doctors, 'mehta').map((d) => d.id)).toEqual(['1']);
    expect(searchDoctors(doctors, 'Dr Rohan').map((d) => d.id)).toEqual(['2']);
  });

  it('matches specialty and qualification', () => {
    expect(searchDoctors(doctors, 'dermatology').map((d) => d.id)).toEqual(['2']);
    expect(searchDoctors(doctors, 'DCH').map((d) => d.id)).toEqual(['3']);
  });

  it('maps symptoms to the specialties that treat them', () => {
    expect(searchDoctors(doctors, 'fever').map((d) => d.id)).toEqual(['1']);
    expect(searchDoctors(doctors, 'acne').map((d) => d.id)).toEqual(['2']);
    expect(searchDoctors(doctors, 'baby cough').map((d) => d.id).sort()).toEqual(['1', '3']);
    expect(symptomSpecialties('knee pain')).toHaveLength(1);
  });

  it('applies the specialty filter first', () => {
    expect(searchDoctors(doctors, '', 's-Dermatology').map((d) => d.id)).toEqual(['2']);
    expect(searchDoctors(doctors, 'fever', 's-Dermatology')).toEqual([]);
  });

  it('finds nothing for an unrelated word', () => {
    expect(searchDoctors(doctors, 'thyrocare')).toEqual([]);
  });
});
