// Field checks ported from docnowtesting/client/src/components/doctor/ApplicationForm.tsx
import type { DoctorProfileInput } from './types';

export interface DoctorFormValues {
  displayName: string;
  specialtyId: string;
  qualification: string;
  registrationNumber: string;
  registrationCouncil: string;
  experienceYears: string;
  languages: string;
  bio: string;
  photoUrl: string;
}

export type DoctorFormErrors = Partial<Record<keyof DoctorFormValues, string>>;

export const emptyDoctorForm = (): DoctorFormValues => ({
  displayName: '', specialtyId: '', qualification: '', registrationNumber: '', registrationCouncil: '',
  experienceYears: '0', languages: '', bio: '', photoUrl: '',
});

/** Splits on commas, trims, drops blanks and repeats (ignoring case). */
export function splitLanguages(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(',')) {
    const l = raw.trim();
    if (!l || seen.has(l.toLowerCase())) continue;
    seen.add(l.toLowerCase());
    out.push(l);
  }
  return out;
}

function isWebAddress(v: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
}

export function validateDoctorForm(v: DoctorFormValues): { errors: DoctorFormErrors } | { input: DoctorProfileInput } {
  const errors: DoctorFormErrors = {};
  const t = (s: string) => s.trim();
  if (t(v.displayName).length < 2) errors.displayName = 'Enter your name.';
  if (!v.specialtyId) errors.specialtyId = 'Choose a specialty.';
  if (t(v.qualification).length < 2) errors.qualification = 'Enter your qualification.';
  if (t(v.registrationNumber).length < 3) errors.registrationNumber = 'Enter your registration number.';
  if (t(v.registrationCouncil).length < 2) errors.registrationCouncil = 'Enter your registration council.';
  if (!/^\d{1,2}$/.test(t(v.experienceYears)) || Number(t(v.experienceYears)) > 70) {
    errors.experienceYears = 'Enter whole years, 0 to 70.';
  }
  const languages = splitLanguages(v.languages);
  if (languages.length < 1) errors.languages = 'Add at least one language.';
  else if (languages.some((l) => l.length < 2)) errors.languages = 'Each language needs at least 2 letters.';
  if (t(v.bio).length > 1000) errors.bio = 'Keep your bio under 1000 characters.';
  if (t(v.photoUrl) !== '' && !isWebAddress(t(v.photoUrl))) {
    errors.photoUrl = 'Enter a full web address, like https://example.com/photo.jpg.';
  }
  if (Object.keys(errors).length) return { errors };
  return {
    input: {
      displayName: t(v.displayName),
      specialtyId: v.specialtyId,
      qualification: t(v.qualification),
      registrationNumber: t(v.registrationNumber),
      registrationCouncil: t(v.registrationCouncil),
      experienceYears: Number(t(v.experienceYears)),
      languages,
      ...(t(v.bio) ? { bio: t(v.bio) } : {}),
      ...(t(v.photoUrl) ? { photoUrl: t(v.photoUrl) } : {}),
    },
  };
}
