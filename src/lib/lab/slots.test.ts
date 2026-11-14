import { describe, expect, it } from 'vitest';

import { parseSlots, rescheduleBody } from './slots';

describe('reading the lab partner slots', () => {
    it('finds the slots under data.slots', () => {
        const slots = parseSlots({ data: { slots: [{ stm_id: 7, slot_time: '09:00', end_time: '11:00' }] } });
        expect(slots).toEqual([{ id: '7', label: '09:00 - 11:00', startTime: '09:00', endTime: '11:00', slotDate: null }]);
    });

    it('finds the slots at the top level, or as a plain array', () => {
        expect(parseSlots({ slots: [{ slot_id: 'a', start_time: '07:00' }] })[0].id).toBe('a');
        expect(parseSlots([{ id: 'b', slot_time: '08:00' }])[0].id).toBe('b');
        expect(parseSlots({ data: [{ id: 'c', slot_time: '08:30' }] })[0].id).toBe('c');
    });

    it('prefers the partner slot id the reschedule route expects', () => {
        expect(parseSlots([{ stm_id: 'stm', slot_id: 'other', slot_time: '09:00' }])[0].id).toBe('stm');
    });

    it('drops rows with no id or no time, so no unusable slot is offered', () => {
        expect(parseSlots([{ slot_time: '09:00' }, { stm_id: 1 }, 'nonsense', null])).toEqual([]);
    });

    it('returns nothing for a reply with no slots in it', () => {
        expect(parseSlots({ status: false, message: 'no slots' })).toEqual([]);
        expect(parseSlots(null)).toEqual([]);
        expect(parseSlots(undefined)).toEqual([]);
    });

    it('labels a slot with only a start time by that time', () => {
        expect(parseSlots([{ stm_id: 3, slot_time: '09:00' }])[0].label).toBe('09:00');
    });
});

describe('reschedule request', () => {
    it('sends the partner slot id and the slot text to store', () => {
        const slot = { id: '7', label: '09:00 - 11:00', startTime: '09:00', endTime: '11:00', slotDate: '2026-11-21' };
        expect(rescheduleBody(slot, '2026-11-20', 'Change in plans')).toEqual({
            slot_id: '7',
            slotDate: '2026-11-21',
            slotTime: '09:00 - 11:00',
            reschedule_reason: 'Change in plans',
        });
    });

    it('falls back to the chosen date when the slot does not carry one', () => {
        const slot = { id: '7', label: '09:00', startTime: '09:00', endTime: '', slotDate: null };
        expect(rescheduleBody(slot, '2026-11-20', 'Travelling')).toMatchObject({
            slotDate: '2026-11-20',
            slotTime: '09:00',
        });
    });
});
