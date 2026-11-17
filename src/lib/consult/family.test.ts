import { describe, expect, it } from 'vitest';

import { deepLinkPath, parseDeepLink } from '@/lib/deep-links';
import {
    arrangeTiles,
    bookedForYouLabel,
    formatMobile,
    guestCopy,
    intakeError,
    intakeFromPerson,
    intakePatch,
    isFamilyPerson,
    normalizeMobile,
    partyOf,
    partyOfRole,
    toggleChip,
} from './family';
import { pickOtherParty } from './useDoctorPresence';

const TOKEN = '3f2b8c1e-9a4d-4b7e-8f61-2c5d9e0a7b13';

describe('family intake rules', () => {
    it('treats anyone but Self as family', () => {
        expect(isFamilyPerson({ relation: 'Self' })).toBe(false);
        expect(isFamilyPerson({ relation: 'self' })).toBe(false);
        expect(isFamilyPerson({ relation: 'Parent' })).toBe(true);
    });

    it('keeps "None" exclusive', () => {
        expect(toggleChip(['Diabetes'], 'None')).toEqual(['None']);
        expect(toggleChip(['None'], 'Asthma')).toEqual(['Asthma']);
        expect(toggleChip(['None'], 'None')).toEqual([]);
        expect(toggleChip(['Diabetes', 'Asthma'], 'Diabetes')).toEqual(['Asthma']);
    });

    it('reads and formats Indian mobiles', () => {
        expect(normalizeMobile('+91 98765 43210')).toBe('9876543210');
        expect(normalizeMobile('98765 4321')).toBeNull();
        expect(formatMobile('9876543210')).toBe('98765 43210');
        expect(formatMobile('98765')).toBe('98765');
    });

    it('saves the intake on the person: "None" as an empty list, phone as 10 digits', () => {
        const d = { ...intakeFromPerson({ id: 'p', name: 'Sunita', relation: 'Parent', age: 64, gender: 'Female' }), phone: '98765 43210', chronicConditions: ['None'], allergies: ['Penicillin'] };
        expect(intakePatch(d)).toEqual({ phone: '9876543210', preferredLanguage: 'hi', chronicConditions: [], allergies: ['Penicillin'], currentMedications: [] });
        expect(intakeError({ ...d, phone: '12345' })).toMatch(/valid 10-digit/);
        expect(intakeError({ ...d, phone: '' })).toBeNull();
        expect(intakePatch({ ...d, phone: '' }).phone).toBeNull();
    });

    it('labels a booking made by family', () => {
        expect(bookedForYouLabel({ bookedBy: { name: 'Aditya Verma', relation: 'Parent' } })).toEqual({ title: 'Booked for you by Aditya', detail: 'They added you as their parent' });
        expect(bookedForYouLabel({}).title).toBe('Booked for you by your family member');
    });
});

describe('three-way call identities', () => {
    const doctor = { identity: 'doctor:d1' };
    const patient = { identity: 'patient:p1' };
    const caretaker = { identity: 'caretaker:u1' };

    it('reads parties from identities and roles', () => {
        expect(partyOf('caretaker:u1')).toBe('caretaker');
        expect(partyOf('legacy-user-id')).toBeNull();
        expect(partyOfRole('caretaker-audio')).toBe('caretaker');
        expect(partyOfRole('patient')).toBe('patient');
    });

    it('the patient side waits for the doctor, not for whoever joined first', () => {
        expect(pickOtherParty([caretaker], 'patient')).toBeUndefined();
        expect(pickOtherParty([caretaker, doctor], 'patient')).toBe(doctor);
        expect(pickOtherParty([caretaker, doctor], 'caretaker')).toBe(doctor);
    });

    it('the doctor waits for the patient, and counts the caregiver if the patient is not there', () => {
        expect(pickOtherParty([caretaker, patient], 'doctor')).toBe(patient);
        expect(pickOtherParty([caretaker], 'doctor')).toBe(caretaker);
    });

    it('old rooms without prefixed identities keep the first-person rule', () => {
        const old = { identity: 'u-123' };
        expect(pickOtherParty([old], 'patient')).toBe(old);
        expect(arrangeTiles([caretaker, doctor], 'patient')).toEqual({ primary: doctor, others: [caretaker] });
    });
});

describe('zero-login call links', () => {
    it('opens docnow://consult/guest/<token> and https://docnow.in/call/<token> in the app', () => {
        expect(parseDeepLink(`docnow://consult/guest/${TOKEN}`)).toEqual({ kind: 'guest-call', id: TOKEN });
        expect(parseDeepLink(`https://docnow.in/call/${TOKEN}`)).toEqual({ kind: 'guest-call', id: TOKEN });
        expect(parseDeepLink(`https://www.docnow.in/call/${TOKEN}?utm=wa`)).toEqual({ kind: 'guest-call', id: TOKEN });
        expect(deepLinkPath({ kind: 'guest-call', id: TOKEN })).toBe(`/call/${TOKEN}`);
    });

    it('still refuses other hosts', () => {
        expect(parseDeepLink(`https://docnow.in.evil.example/call/${TOKEN}`)).toBeNull();
        expect(parseDeepLink(`https://evil.example/call/${TOKEN}`)).toBeNull();
    });

    it('greets in the patient language first', () => {
        const copy = guestCopy({ patientFirstName: 'Sunita', doctor: { name: 'Sharma' }, language: 'hi' });
        expect(copy.primary.greeting).toBe('नमस्ते Sunita जी, Dr. Sharma आपसे परामर्श के लिए तैयार हैं');
        expect(`${copy.primary.start} (${copy.secondary.start})`).toBe('डॉक्टर से बात करें (Start Call)');
    });
});
