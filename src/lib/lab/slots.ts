// The reschedule-slots route passes the lab partner's reply straight through, so the app has to
// cope with the several shapes and key names it arrives in.
import type { LabSlot, RawSlot } from './types';

interface SlotEnvelope {
    data?: { slots?: unknown } | unknown;
    slots?: unknown;
}

const isRawSlot = (value: unknown): value is RawSlot => typeof value === 'object' && value !== null;

/** Finds the slot array wherever it sits in the reply, then drops rows with no usable id. */
export function parseSlots(payload: unknown): LabSlot[] {
    const envelope = (payload ?? {}) as SlotEnvelope;
    const nested = (envelope.data ?? {}) as { slots?: unknown };
    const candidates = [nested.slots, envelope.slots, envelope.data, payload];
    const rows = candidates.find((value) => Array.isArray(value)) as unknown[] | undefined;
    if (!rows) return [];

    const slots: LabSlot[] = [];
    for (const row of rows) {
        if (!isRawSlot(row)) continue;
        const slot = toSlot(row);
        if (slot) slots.push(slot);
    }
    return slots;
}

function toSlot(row: RawSlot): LabSlot | null {
    const id = row.stm_id ?? row.slot_id ?? row.id;
    if (id === undefined || id === null || String(id) === '') return null;
    const startTime = String(row.slot_time ?? row.start_time ?? '').trim();
    const endTime = String(row.end_time ?? '').trim();
    if (startTime === '') return null;
    return {
        id: String(id),
        label: endTime ? `${startTime} - ${endTime}` : startTime,
        startTime,
        endTime,
        slotDate: row.slot_date ?? null,
    };
}

/** What the reschedule route expects: the partner slot id plus the slot text we will store. */
export function rescheduleBody(slot: LabSlot, fallbackDate: string, reason: string) {
    return {
        slot_id: slot.id,
        slotDate: slot.slotDate ?? fallbackDate,
        slotTime: slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime,
        reschedule_reason: reason,
    };
}

export const CANCEL_REASON_MIN = 5;
export const RESCHEDULE_REASON_MIN = 5;
