/** Rules for the pre-call waiting room and the doctor-delay card, kept apart from React so they can be tested. */
import { JOIN_LATE_MS } from './room';
import type { BookingView, ConsultationStatus } from './types';

/** The waiting room replaces the booking page this long before the start. The room itself opens 10 minutes before. */
export const WAITING_ROOM_LEAD_MS = 15 * 60_000;
/** Must match the server's DOCTOR_LATE_AFTER_MS; used only when an older server leaves doctorLateAt out. */
export const DOCTOR_LATE_AFTER_MS = 5 * 60_000;

const WAITING: ConsultationStatus[] = ['CONFIRMED', 'WAITING'];

type Timing = Pick<BookingView, 'status' | 'startsAt' | 'endsAt'>;

export function showWaitingRoom(b: Timing, nowMs: number): boolean {
    if (!WAITING.includes(b.status)) return false;
    return nowMs >= Date.parse(b.startsAt) - WAITING_ROOM_LEAD_MS && nowMs <= Date.parse(b.endsAt) + JOIN_LATE_MS;
}

/** 754 → "12:34". Never negative. */
export function formatMmSs(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function countdownLabel(startsAt: string, nowMs: number): string {
    const left = Math.ceil((Date.parse(startsAt) - nowMs) / 1000);
    return left > 0 ? `Your consultation starts in ${formatMmSs(left)}` : 'Your consultation is starting now';
}

/** How far through the 15-minute lead-up we are, 0 when the waiting room appears to 1 at the start time. */
export function waitingProgress(startsAt: string, nowMs: number): number {
    const left = Date.parse(startsAt) - nowMs;
    return Math.min(1, Math.max(0, 1 - left / WAITING_ROOM_LEAD_MS));
}

/** The bare "12:34" left before the start, for the ring's centre (null once it has started). */
export function timeLeft(startsAt: string, nowMs: number): string | null {
    const left = Math.ceil((Date.parse(startsAt) - nowMs) / 1000);
    return left > 0 ? formatMmSs(left) : null;
}

export interface DoctorDelay {
    /** Seconds since the start time. */
    elapsedSeconds: number;
    /** Whole minutes late, at least 5. */
    minutesLate: number;
    /** When the server refunds in full by itself if the doctor still has not joined (null if unknown). */
    autoRefundAt: string | null;
}

/**
 * The doctor is late once the late mark passes while they are not in the room. `doctorPresent`
 * comes from the live room when in a call, and from the booking (doctorJoined) otherwise.
 */
export function doctorDelay(b: Pick<BookingView, 'status' | 'startsAt' | 'doctorLateAt' | 'doctorNoShowAt'>, doctorPresent: boolean, nowMs: number): DoctorDelay | null {
    if (doctorPresent || !WAITING.includes(b.status)) return null;
    const lateAt = b.doctorLateAt ? Date.parse(b.doctorLateAt) : Date.parse(b.startsAt) + DOCTOR_LATE_AFTER_MS;
    if (nowMs < lateAt) return null;
    const elapsedSeconds = Math.floor((nowMs - Date.parse(b.startsAt)) / 1000);
    return { elapsedSeconds, minutesLate: Math.max(5, Math.floor(elapsedSeconds / 60)), autoRefundAt: b.doctorNoShowAt ?? null };
}

// ── Pre-call notes (checklist + questions), saved on this phone per consultation ──

export const CHECKLIST = [
    { id: 'medicines', label: 'Current medicines and prescriptions handy' },
    { id: 'reports', label: 'Previous lab reports ready to discuss' },
    { id: 'environment', label: 'Peaceful environment with good lighting' },
] as const;

export type ChecklistId = (typeof CHECKLIST)[number]['id'];

export interface PrecallNotes {
    checked: ChecklistId[];
    questions: string;
}

export const QUESTIONS_MAX = 2000;
export const emptyNotes = (): PrecallNotes => ({ checked: [], questions: '' });
export const notesKey = (consultationId: string) => `docnow_precall_${consultationId}`;

export function serializeNotes(n: PrecallNotes): string {
    return JSON.stringify({ v: 1, checked: n.checked, questions: n.questions.slice(0, QUESTIONS_MAX) });
}

export function parseNotes(raw: string | null): PrecallNotes {
    if (!raw) return emptyNotes();
    try {
        const p = JSON.parse(raw) as { v?: unknown; checked?: unknown; questions?: unknown };
        if (p.v !== 1) return emptyNotes();
        const ids = CHECKLIST.map((c) => c.id) as readonly string[];
        const checked = Array.isArray(p.checked) ? (p.checked.filter((c) => typeof c === 'string' && ids.includes(c)) as ChecklistId[]) : [];
        return { checked: [...new Set(checked)], questions: typeof p.questions === 'string' ? p.questions.slice(0, QUESTIONS_MAX) : '' };
    } catch {
        return emptyNotes();
    }
}

export function toggleChecked(n: PrecallNotes, id: ChecklistId): PrecallNotes {
    return { ...n, checked: n.checked.includes(id) ? n.checked.filter((c) => c !== id) : [...n.checked, id] };
}

/** "Usually within 5–7 working days" style copy for a refund status from Razorpay. */
export function refundEta(status: BookingView['refundStatus']): string {
    if (status === 'PROCESSED') return 'Sent to your original payment method. Banks usually show it within 5–7 working days.';
    if (status === 'FAILED') return 'The refund needs a manual step. Our team has been told and will complete it.';
    return 'On its way to your original payment method, usually within 5–7 working days.';
}
