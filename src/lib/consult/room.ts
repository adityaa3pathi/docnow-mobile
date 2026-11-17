// Copied from docnowtesting/client/src/lib/consult/room.ts
/** Pure rules for the video room and prescription screens, kept apart from React so they can be tested. */
import type { ConsultationStatus, Medicine, Prescription, PrescriptionInput } from './types';

/** Must match the server's join window in consultations.room.ts. */
export const JOIN_EARLY_MS = 10 * 60_000;
export const JOIN_LATE_MS = 15 * 60_000;
const JOINABLE: ConsultationStatus[] = ['CONFIRMED', 'WAITING', 'IN_PROGRESS'];

export type JoinWindow =
    | { kind: 'not_joinable' }
    | { kind: 'early'; opensAt: string }
    | { kind: 'open' }
    | { kind: 'ended' };

export function joinWindow(c: { status: ConsultationStatus; startsAt: string; endsAt: string }, nowMs: number): JoinWindow {
    if (!JOINABLE.includes(c.status)) return { kind: 'not_joinable' };
    const opens = Date.parse(c.startsAt) - JOIN_EARLY_MS;
    if (nowMs < opens) return { kind: 'early', opensAt: new Date(opens).toISOString() };
    if (nowMs > Date.parse(c.endsAt) + JOIN_LATE_MS) return { kind: 'ended' };
    return { kind: 'open' };
}

/** The doctor's page re-checks only while the patient might still arrive and the doctor is not in the call. */
export function shouldWatchForPatient(status: ConsultationStatus, inCall: boolean): boolean {
    return !inCall && (status === 'CONFIRMED' || status === 'WAITING');
}

export const emptyMedicine = (): Medicine => ({ name: '', dose: '', frequency: '', duration: '', instructions: '' });

/** Splits typed test codes on commas, spaces or new lines, dropping blanks and repeats. */
export function parseTestCodes(text: string): string[] {
    return [...new Set(text.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean))];
}

export type BuildResult = { ok: true; body: PrescriptionInput } | { ok: false; error: string };

/** Checks the builder form the same way the server does, so the doctor sees problems before the confirm step. */
export function buildPrescription(rows: Medicine[], codesText: string, advice: string): BuildResult {
    const trimmed = rows.map((r) => ({
        name: r.name.trim(), dose: r.dose.trim(), frequency: r.frequency.trim(), duration: r.duration.trim(), instructions: r.instructions.trim(),
    }));
    const medicines = trimmed.filter((r) => Object.values(r).some(Boolean));
    if (medicines.some((m) => !m.name)) return { ok: false, error: 'Each medicine needs a name.' };
    if (medicines.length > 20) return { ok: false, error: 'Add at most 20 medicines.' };
    const testCodes = parseTestCodes(codesText);
    if (testCodes.length > 10) return { ok: false, error: 'Add at most 10 tests.' };
    const cleanAdvice = advice.trim();
    if (!medicines.length && !testCodes.length && !cleanAdvice) {
        return { ok: false, error: 'Add at least one medicine, test or advice.' };
    }
    return { ok: true, body: { medicines, testCodes, ...(cleanAdvice ? { advice: cleanAdvice } : {}) } };
}

export interface BuilderState {
    rows: Medicine[];
    codes: string;
    advice: string;
}

export const emptyBuilder = (): BuilderState => ({ rows: [emptyMedicine()], codes: '', advice: '' });

/** Pre-fills the builder from the current version, so a correction starts from what was issued. */
export function builderFromPrescription(p: Prescription): BuilderState {
    return {
        rows: p.medicines.length ? p.medicines.map((m) => ({ ...emptyMedicine(), ...m })) : [emptyMedicine()],
        codes: p.recommendedTests.map((t) => t.code).join(', '),
        advice: p.advice ?? '',
    };
}

export const REISSUE_REASON_MIN = 5;
export const REISSUE_REASON_MAX = 300;

/** Must match REISSUE_WINDOW_MS in the server's consultations.prescription.ts, counted from the visit's start. */
export const REISSUE_WINDOW_MS = 7 * 24 * 3_600_000;

export type ReissueWindow = { open: true } | { open: false; reason: string };

/** Checked before the form opens, so the doctor is not asked to retype a correction the server will refuse. */
export function reissueWindow(startsAt: string, nowMs: number): ReissueWindow {
    const start = Date.parse(startsAt);
    // An unreadable date is left to the server rather than locking the doctor out on a parsing slip.
    if (Number.isNaN(start)) return { open: true };
    if (nowMs - start <= REISSUE_WINDOW_MS) return { open: true };
    return { open: false, reason: 'A prescription can be corrected only within 7 days of the consultation. Please contact the DocNow team if it still needs a change.' };
}
