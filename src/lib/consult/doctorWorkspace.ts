/** Rules for the doctor's consultation page, kept apart from React so they can be tested. */
import { doctorStatusLabel } from './doctorConsultations';
import { joinWindow } from './room';
import type { Tone } from './status';
import type { DoctorConsultationRecord } from './types';

/** The join button appears this long before the start, even though the room opens 10 minutes before. */
export const JOIN_HEADS_UP_MS = 15 * 60_000;
export const PRESENCE_POLL_MS = 5_000;

export type PrimaryAction =
    | { kind: 'join'; rejoin: boolean }
    | { kind: 'opens-soon'; opensAt: string }
    | { kind: 'write-rx' }
    | { kind: 'view-rx' }
    | { kind: 'none' };

/** Notes and prescriptions open once the call has started; the server answers 409 before that. */
export const canWritePrescription = (r: Pick<DoctorConsultationRecord, 'status' | 'prescription'>) =>
    (r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') && !r.prescription;

export function primaryAction(r: DoctorConsultationRecord, nowMs: number, inCall: boolean): PrimaryAction {
    if (inCall) return { kind: 'none' };
    if (r.prescription) return { kind: 'view-rx' };
    const win = joinWindow({ status: r.status, startsAt: r.startsAt, endsAt: r.slot.endsAt }, nowMs);
    if (win.kind === 'open') return { kind: 'join', rejoin: !!r.doctorJoinedAt };
    if (win.kind === 'early' && Date.parse(r.startsAt) - nowMs <= JOIN_HEADS_UP_MS) return { kind: 'opens-soon', opensAt: win.opensAt };
    if (canWritePrescription(r)) return { kind: 'write-rx' };
    return { kind: 'none' };
}

/**
 * Polls while the patient might still walk into the room and the doctor is not in the call,
 * so the page can say "Patient is waiting". Stops once the visit is over or the doctor is in.
 */
export function presencePollMs(r: DoctorConsultationRecord | undefined, inCall: boolean): number | false {
    if (!r || inCall) return false;
    const live = r.status === 'CONFIRMED' || r.status === 'WAITING' || r.status === 'IN_PROGRESS';
    return live ? PRESENCE_POLL_MS : false;
}

/** True when the patient has entered the room and is waiting on the doctor. */
export const patientWaiting = (r: DoctorConsultationRecord, inCall: boolean) =>
    !inCall && !!r.patientJoinedAt && (r.status === 'WAITING' || r.status === 'IN_PROGRESS' || r.status === 'CONFIRMED');

export function workspaceBadge(r: DoctorConsultationRecord, inCall: boolean): { label: string; tone: Tone } {
    if (inCall) return { label: 'In call', tone: 'success' };
    return doctorStatusLabel(r.status);
}
