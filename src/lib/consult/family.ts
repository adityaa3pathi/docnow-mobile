/** Assisted family consultations on the phone: intake rules, labels and call identities. Pure, so it can be tested. */
import type { Person, PersonIntake } from './api';
import type { BookingView } from './types';

export const CONDITION_PRESETS = ['Diabetes', 'Hypertension', 'Thyroid', 'Heart Disease', 'Asthma'] as const;
export const ALLERGY_PRESETS = ['Penicillin', 'Sulfa', 'Paracetamol', 'Dust/Pollen'] as const;
export const MEDICINE_SUGGESTIONS = ['Metformin 500mg', 'Amlodipine 5mg', 'Thyroxine 50mcg', 'Aspirin 75mg', 'Atorvastatin 10mg'] as const;
/** "None" is its own answer: it clears the other chips, and any chip clears it. */
export const NONE = 'None';
export const MAX_REPORTS = 5;

export const isFamilyPerson = (p: Pick<Person, 'relation'>) => p.relation.trim().toLowerCase() !== 'self';

/** Toggle a chip in a list where "None" excludes everything else. */
export function toggleChip(list: string[], chip: string): string[] {
    if (chip === NONE) return list.includes(NONE) ? [] : [NONE];
    const rest = list.filter((x) => x !== NONE);
    return rest.includes(chip) ? rest.filter((x) => x !== chip) : [...rest, chip];
}

/** What the server stores: "None" means an explicit empty list. */
export const chipsForServer = (list: string[]) => list.filter((x) => x !== NONE);

/** +91 98765 43210, 098765 43210 or 9876543210 → 9876543210, or null. */
export function normalizeMobile(input: string): string | null {
    let d = input.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** 9876543210 → "98765 43210" for the input beside its fixed +91. */
export function formatMobile(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

export interface IntakeDraft {
    phone: string;
    preferredLanguage: 'hi' | 'en';
    chronicConditions: string[];
    allergies: string[];
    currentMedications: string[];
    isCaregiverJoined: boolean;
    attachedReportIds: string[];
}

export function intakeFromPerson(p: Person): IntakeDraft {
    return {
        phone: p.phone ? formatMobile(p.phone) : '',
        preferredLanguage: p.preferredLanguage ?? 'hi',
        chronicConditions: p.chronicConditions ?? [],
        allergies: p.allergies ?? [],
        currentMedications: p.currentMedications ?? [],
        isCaregiverJoined: true,
        attachedReportIds: [],
    };
}

/** The phone is optional (they can still join from a forwarded link), but if typed it must be valid. */
export function intakeError(d: IntakeDraft): string | null {
    if (d.phone.trim() && !normalizeMobile(d.phone)) return 'Enter a valid 10-digit mobile number for your family member';
    if (d.attachedReportIds.length > MAX_REPORTS) return `Share at most ${MAX_REPORTS} reports`;
    return null;
}

/** The profile part of the intake, saved on the person for all future bookings. */
export function intakePatch(d: IntakeDraft): PersonIntake {
    return {
        phone: d.phone.trim() ? normalizeMobile(d.phone) : null,
        preferredLanguage: d.preferredLanguage,
        chronicConditions: chipsForServer(d.chronicConditions),
        allergies: chipsForServer(d.allergies),
        currentMedications: d.currentMedications,
    };
}

/** "Booked for you by Aditya" and, when known, how the booker listed them ("as their Parent"). */
export function bookedForYouLabel(b: Pick<BookingView, 'bookedBy'>): { title: string; detail: string | null } {
    const name = b.bookedBy?.name?.trim().split(/\s+/)[0] || 'your family member';
    const relation = b.bookedBy?.relation?.trim();
    return { title: `Booked for you by ${name}`, detail: relation && relation.toLowerCase() !== 'others' ? `They added you as their ${relation.toLowerCase()}` : null };
}

// ── Three-way call identities: doctor:<id>, patient:<id>, caretaker:<userId> ──

export type CallParty = 'doctor' | 'patient' | 'caretaker';

export function partyOf(identity: string): CallParty | null {
    const prefix = identity.split(':', 1)[0];
    return prefix === 'doctor' || prefix === 'patient' || prefix === 'caretaker' ? prefix : null;
}

export function partyOfRole(role: string): CallParty {
    const base = role.replace(/-audio$/, '');
    return base === 'doctor' || base === 'caretaker' ? base : 'patient';
}

/** The big tile: the doctor for the patient side, the patient for the doctor; the rest are small. */
export function arrangeTiles<T extends { identity: string }>(remotes: T[], viewer: CallParty): { primary: T | undefined; others: T[] } {
    const want: CallParty = viewer === 'doctor' ? 'patient' : 'doctor';
    const primary = remotes.find((r) => partyOf(r.identity) === want) ?? remotes[0];
    return { primary, others: remotes.filter((r) => r !== primary) };
}

/** Bilingual copy for the zero-login room: the person's language first, the other beneath. */
export function guestCopy(info: { patientFirstName: string; doctor: { name: string }; language: 'hi' | 'en' }) {
    const name = info.patientFirstName;
    const dr = info.doctor.name.startsWith('Dr') ? info.doctor.name : `Dr. ${info.doctor.name}`;
    const en = {
        greeting: `Namaste ${name} ji, ${dr} is ready for your consultation`,
        waiting: `Namaste ${name} ji, your consultation with ${dr} will start soon`,
        start: 'Start Call',
        early: 'The room opens 10 minutes before your time',
        doctorIn: `${dr} has joined`,
        allow: 'When asked, tap "Allow" for the camera and microphone.',
    };
    const hi = {
        greeting: `नमस्ते ${name} जी, ${dr} आपसे परामर्श के लिए तैयार हैं`,
        waiting: `नमस्ते ${name} जी, ${dr} से आपका परामर्श जल्द शुरू होगा`,
        start: 'डॉक्टर से बात करें',
        early: 'आपके समय से 10 मिनट पहले कमरा खुलेगा',
        doctorIn: `${dr} आ गए हैं`,
        allow: 'पूछे जाने पर कैमरा और माइक के लिए "Allow" दबाएँ।',
    };
    return info.language === 'hi' ? { primary: hi, secondary: en } : { primary: en, secondary: hi };
}

