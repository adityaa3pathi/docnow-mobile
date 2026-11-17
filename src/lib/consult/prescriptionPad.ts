/**
 * Rules for the doctor's prescription pad, kept apart from React so they can be tested.
 * The pad writes two server records: the consultation note (complaints, findings, diagnosis)
 * and the prescription itself (medicines, tests, advice). Limits mirror the server's zod schemas.
 */
import type { ConsultRoomEvent, Medicine, NoteInput, Prescription, PrescriptionInput, RecommendedTest } from './types';

export const COMPLAINT_PRESETS = ['Fever', 'Cough', 'Headache', 'Cold', 'Body ache', 'Sore throat', 'Acidity', 'Hypertension', 'Diabetes follow-up'] as const;
export const MEDICINE_PRESETS = ['Paracetamol 650mg', 'Amoxicillin 500mg', 'Pantoprazole 40mg', 'Cetirizine 10mg', 'Azithromycin 500mg', 'ORS sachet'] as const;
export const TEST_PRESETS = ['CBC', 'Thyroid Profile', 'Lipid Profile', 'HbA1c', 'Vitamin D', 'LFT'] as const;

export const DOSAGES = ['1-0-1', '1-0-0', '0-0-1', '1-1-1', 'SOS'] as const;
export const FOOD_TIMINGS = ['Before Food', 'After Food', 'With Food'] as const;
export const DURATIONS = ['3 Days', '5 Days', '7 Days', '14 Days'] as const;

export type Dosage = (typeof DOSAGES)[number];
export type FoodTiming = (typeof FOOD_TIMINGS)[number];

export const LIMITS = {
    medicines: 20,
    tests: 10,
    medicineName: 120,
    duration: 60,
    complaints: 2000,
    findings: 2000,
    diagnosis: 1000,
    advice: 2000,
} as const;

export interface PadMedicine {
    id: string;
    name: string;
    dosage: Dosage;
    timing: FoodTiming;
    /** A preset such as "5 Days", or the doctor's own text. */
    duration: string;
}

export interface PadDraft {
    complaints: string[];
    findings: string;
    diagnosis: string;
    advice: string;
    medicines: PadMedicine[];
    tests: RecommendedTest[];
}

export const emptyDraft = (): PadDraft => ({ complaints: [], findings: '', diagnosis: '', advice: '', medicines: [], tests: [] });

const DOSAGE_WORDS: Record<Dosage, string> = {
    '1-0-1': '1-0-1 (morning, night)',
    '1-0-0': '1-0-0 (morning)',
    '0-0-1': '0-0-1 (night)',
    '1-1-1': '1-1-1 (morning, afternoon, night)',
    SOS: 'SOS (only when needed)',
};

export function isEmptyDraft(d: PadDraft): boolean {
    return !d.complaints.length && !d.findings.trim() && !d.diagnosis.trim() && !d.advice.trim() && !d.medicines.length && !d.tests.length;
}

/** Adds a complaint once (case-insensitive), or removes it if it is already there. */
export function toggleComplaint(list: string[], complaint: string): string[] {
    const clean = complaint.trim();
    if (!clean) return list;
    const exists = list.some((c) => c.toLowerCase() === clean.toLowerCase());
    return exists ? list.filter((c) => c.toLowerCase() !== clean.toLowerCase()) : [...list, clean];
}

/** Adds a test once by catalog code, keeping the server's limit. Returns the same list if refused. */
export function addTest(list: RecommendedTest[], test: RecommendedTest): RecommendedTest[] {
    if (list.length >= LIMITS.tests || list.some((t) => t.code === test.code)) return list;
    return [...list, test];
}

/** Adds a new line item, or replaces the one with the same id (an edit). */
export function upsertMedicine(list: PadMedicine[], med: PadMedicine): PadMedicine[] {
    const i = list.findIndex((m) => m.id === med.id);
    if (i === -1) return [...list, med];
    return list.map((m) => (m.id === med.id ? med : m));
}

/** Problems with one medicine line before it is added to the list. */
export function medicineError(med: Pick<PadMedicine, 'name' | 'duration'>): string | null {
    if (!med.name.trim()) return 'Enter the medicine name.';
    if (med.name.trim().length > LIMITS.medicineName) return `Medicine name must be under ${LIMITS.medicineName} characters.`;
    if (!med.duration.trim()) return 'Choose how long it should be taken.';
    if (med.duration.trim().length > LIMITS.duration) return 'Duration is too long.';
    return null;
}

/**
 * Everything that stops the pad from being issued, in the order the doctor should fix it.
 * The pad needs a medicine or a diagnosis to be clinically meaningful; the server additionally
 * refuses a prescription with no medicine, test or advice, so a diagnosis alone is not enough.
 */
export function validatePad(d: PadDraft): string[] {
    const errors: string[] = [];
    const hasMedicine = d.medicines.length > 0;
    if (!hasMedicine && !d.diagnosis.trim()) errors.push('Add at least one medicine or a diagnosis.');
    else if (!hasMedicine && !d.tests.length && !d.advice.trim()) {
        errors.push('Add a medicine, a test or advice to go with the diagnosis.');
    }
    const bad = d.medicines.find((m) => medicineError(m));
    if (bad) errors.push(`${bad.name.trim() || 'A medicine'}: ${medicineError(bad)}`);
    if (d.medicines.length > LIMITS.medicines) errors.push(`Add at most ${LIMITS.medicines} medicines.`);
    if (d.tests.length > LIMITS.tests) errors.push(`Recommend at most ${LIMITS.tests} tests.`);
    const complaints = d.complaints.join(', ');
    if (complaints.length > LIMITS.complaints) errors.push('Chief complaints are too long.');
    if (d.findings.trim().length > LIMITS.findings) errors.push('Examination notes are too long.');
    if (d.diagnosis.trim().length > LIMITS.diagnosis) errors.push('Diagnosis is too long.');
    if (d.advice.trim().length > LIMITS.advice) errors.push('Advice is too long.');
    return errors;
}

export function toMedicine(m: PadMedicine): Medicine {
    return {
        name: m.name.trim(),
        dose: '',
        frequency: DOSAGE_WORDS[m.dosage],
        duration: m.duration.trim(),
        instructions: m.timing,
    };
}

export interface IssuePayload {
    notes: NoteInput;
    prescription: PrescriptionInput;
}

/** The two request bodies, or the validation errors. Blank text fields are left out, not sent empty. */
export function buildIssuePayload(d: PadDraft): { ok: true; payload: IssuePayload } | { ok: false; errors: string[] } {
    const errors = validatePad(d);
    if (errors.length) return { ok: false, errors };
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const advice = opt(d.advice);
    return {
        ok: true,
        payload: {
            notes: {
                complaints: opt(d.complaints.join(', ')),
                findings: opt(d.findings),
                diagnosis: opt(d.diagnosis),
                advice,
            },
            prescription: {
                medicines: d.medicines.map(toMedicine),
                testCodes: d.tests.map((t) => t.code),
                ...(advice ? { advice } : {}),
            },
        },
    };
}

// ── Local draft (auto-save) ─────────────────────────────

const DRAFT_VERSION = 1;
/** A draft older than this is from a different visit in practice, so it is not restored. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 3_600_000;

export const draftKey = (consultationId: string) => `docnow_rx_draft_${consultationId}`;

export function serializeDraft(d: PadDraft, now = Date.now()): string {
    return JSON.stringify({ v: DRAFT_VERSION, savedAt: now, draft: d });
}

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');

/** Reads a stored draft back, refusing anything malformed, from another version, or stale. */
export function parseDraft(raw: string | null, now = Date.now()): PadDraft | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as { v?: unknown; savedAt?: unknown; draft?: Partial<PadDraft> };
        if (parsed.v !== DRAFT_VERSION || typeof parsed.savedAt !== 'number' || now - parsed.savedAt > DRAFT_MAX_AGE_MS) return null;
        const d = parsed.draft;
        if (!d || !isStringArray(d.complaints) || !Array.isArray(d.medicines) || !Array.isArray(d.tests)) return null;
        const medicines = d.medicines.filter(
            (m): m is PadMedicine =>
                !!m && typeof m.id === 'string' && typeof m.name === 'string' && typeof m.duration === 'string' &&
                (DOSAGES as readonly string[]).includes(m.dosage) && (FOOD_TIMINGS as readonly string[]).includes(m.timing),
        );
        const tests = d.tests.filter((t): t is RecommendedTest => !!t && typeof t.code === 'string' && typeof t.name === 'string');
        return {
            complaints: d.complaints,
            findings: typeof d.findings === 'string' ? d.findings : '',
            diagnosis: typeof d.diagnosis === 'string' ? d.diagnosis : '',
            advice: typeof d.advice === 'string' ? d.advice : '',
            medicines,
            tests,
        };
    } catch {
        return null;
    }
}

/** Seeds an empty pad from notes the doctor already saved on the server (e.g. from the web app). */
export function draftFromNote(note: { complaints: string | null; findings: string | null; diagnosis: string | null; advice: string | null } | null): PadDraft {
    const base = emptyDraft();
    if (!note) return base;
    return {
        ...base,
        complaints: (note.complaints ?? '').split(',').map((c) => c.trim()).filter(Boolean),
        findings: note.findings ?? '',
        diagnosis: note.diagnosis ?? '',
        advice: note.advice ?? '',
    };
}

// ── Issuing ─────────────────────────────────────────────

export interface IssueDeps {
    saveNotes: (consultationId: string, body: NoteInput) => Promise<unknown>;
    issue: (consultationId: string, body: PrescriptionInput) => Promise<Prescription>;
    /** Sends on the room's data channel while in a call. Best effort: the server broadcasts too. */
    publish?: (event: ConsultRoomEvent) => Promise<void>;
    /** Marks the consultation COMPLETED. Left out inside a live call, because ending closes the room. */
    complete?: (consultationId: string) => Promise<unknown>;
}

export type IssueOutcome =
    | { ok: false; errors: string[] }
    | { ok: true; prescription: Prescription; completed: boolean; completeError?: unknown };

/**
 * Saves the clinical notes, issues the prescription, tells the room, then completes the visit.
 * Notes go first because the server locks them once a prescription exists. A failure to save notes
 * or issue throws (nothing was issued); a failed broadcast or completion does not undo the issue.
 */
export async function issueFromPad(consultationId: string, draft: PadDraft, deps: IssueDeps): Promise<IssueOutcome> {
    const built = buildIssuePayload(draft);
    if (!built.ok) return built;
    const { notes, prescription } = built.payload;

    if (Object.values(notes).some((v) => v !== undefined)) await deps.saveNotes(consultationId, notes);
    const issued = await deps.issue(consultationId, prescription);

    await deps.publish?.({ v: 1, type: 'PRESCRIPTION_ISSUED', consultationId, prescriptionId: issued.id }).catch(() => {});

    if (!deps.complete) return { ok: true, prescription: issued, completed: false };
    try {
        await deps.complete(consultationId);
        return { ok: true, prescription: issued, completed: true };
    } catch (completeError) {
        return { ok: true, prescription: issued, completed: false, completeError };
    }
}
