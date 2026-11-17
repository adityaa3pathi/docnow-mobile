import { describe, expect, it, vi } from 'vitest';

import { patientWaiting, presencePollMs, primaryAction, workspaceBadge } from './doctorWorkspace';
import {
    addTest,
    buildIssuePayload,
    DRAFT_MAX_AGE_MS,
    draftFromNote,
    emptyDraft,
    issueFromPad,
    LIMITS,
    parseDraft,
    serializeDraft,
    toggleComplaint,
    upsertMedicine,
    validatePad,
    type PadDraft,
    type PadMedicine,
} from './prescriptionPad';
import type { DoctorConsultationRecord, Prescription } from './types';

const med = (over: Partial<PadMedicine> = {}): PadMedicine => ({
    id: 'm1',
    name: 'Paracetamol 650mg',
    dosage: '1-0-1',
    timing: 'After Food',
    duration: '5 Days',
    ...over,
});

const draft = (over: Partial<PadDraft> = {}): PadDraft => ({ ...emptyDraft(), ...over });

const issuedRx = { id: 'rx-1', version: 1 } as Prescription;

describe('prescription pad validation', () => {
    it('refuses an empty pad: needs at least one medicine or a diagnosis', () => {
        expect(validatePad(emptyDraft())).toEqual(['Add at least one medicine or a diagnosis.']);
    });

    it('accepts a single medicine with nothing else', () => {
        expect(validatePad(draft({ medicines: [med()] }))).toEqual([]);
    });

    it('a diagnosis alone is not issuable, because the server needs a medicine, test or advice', () => {
        expect(validatePad(draft({ diagnosis: 'Viral fever' }))).toEqual(['Add a medicine, a test or advice to go with the diagnosis.']);
        expect(validatePad(draft({ diagnosis: 'Viral fever', advice: 'Rest, fluids' }))).toEqual([]);
        expect(validatePad(draft({ diagnosis: 'Viral fever', tests: [{ code: 'CBC01', name: 'CBC' }] }))).toEqual([]);
    });

    it('whitespace does not count as a diagnosis', () => {
        expect(validatePad(draft({ diagnosis: '   ' }))).toEqual(['Add at least one medicine or a diagnosis.']);
    });

    it('flags a medicine line without a name or duration', () => {
        expect(validatePad(draft({ medicines: [med({ name: ' ' })] }))[0]).toMatch(/Enter the medicine name/);
        expect(validatePad(draft({ medicines: [med({ duration: '' })] }))[0]).toMatch(/how long/);
    });

    it('enforces the server limits on medicines, tests and text', () => {
        const many = Array.from({ length: LIMITS.medicines + 1 }, (_, i) => med({ id: `m${i}` }));
        expect(validatePad(draft({ medicines: many }))).toContain(`Add at most ${LIMITS.medicines} medicines.`);
        const tests = Array.from({ length: LIMITS.tests + 1 }, (_, i) => ({ code: `T${i}`, name: `Test ${i}` }));
        expect(validatePad(draft({ medicines: [med()], tests }))).toContain(`Recommend at most ${LIMITS.tests} tests.`);
        expect(validatePad(draft({ medicines: [med()], diagnosis: 'x'.repeat(LIMITS.diagnosis + 1) }))).toContain('Diagnosis is too long.');
    });
});

describe('pad list helpers', () => {
    it('toggles complaints case-insensitively and ignores blanks', () => {
        expect(toggleComplaint([], ' Fever ')).toEqual(['Fever']);
        expect(toggleComplaint(['Fever'], 'fever')).toEqual([]);
        expect(toggleComplaint(['Fever'], '  ')).toEqual(['Fever']);
    });

    it('adds a test once and stops at the limit', () => {
        const one = addTest([], { code: 'CBC01', name: 'CBC' });
        expect(addTest(one, { code: 'CBC01', name: 'CBC' })).toBe(one);
        const full = Array.from({ length: LIMITS.tests }, (_, i) => ({ code: `T${i}`, name: `T${i}` }));
        expect(addTest(full, { code: 'NEW', name: 'New' })).toBe(full);
    });

    it('edits a medicine in place by id and appends new ones', () => {
        const list = [med({ id: 'a' }), med({ id: 'b', name: 'Cetirizine 10mg' })];
        const edited = upsertMedicine(list, med({ id: 'a', dosage: 'SOS' }));
        expect(edited.map((m) => [m.id, m.dosage])).toEqual([['a', 'SOS'], ['b', '1-0-1']]);
        expect(upsertMedicine(list, med({ id: 'c' }))).toHaveLength(3);
    });
});

describe('issue payload', () => {
    it('maps pad lines to the server medicine shape and splits notes from the prescription', () => {
        const res = buildIssuePayload(
            draft({
                complaints: ['Fever', 'Cough'],
                findings: ' Temp 101F ',
                diagnosis: 'Viral URTI',
                advice: '',
                medicines: [med({ dosage: '1-1-1', timing: 'Before Food', duration: '3 Days' })],
                tests: [{ code: 'CBC01', name: 'CBC' }],
            }),
        );
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.payload.notes).toEqual({ complaints: 'Fever, Cough', findings: 'Temp 101F', diagnosis: 'Viral URTI', advice: undefined });
        expect(res.payload.prescription).toEqual({
            medicines: [{ name: 'Paracetamol 650mg', dose: '', frequency: '1-1-1 (morning, afternoon, night)', duration: '3 Days', instructions: 'Before Food' }],
            testCodes: ['CBC01'],
        });
    });

    it('returns the errors instead of a payload when invalid', () => {
        expect(buildIssuePayload(emptyDraft())).toEqual({ ok: false, errors: ['Add at least one medicine or a diagnosis.'] });
    });
});

describe('local draft auto-save format', () => {
    const now = 1_700_000_000_000;

    it('round-trips a draft', () => {
        const d = draft({ complaints: ['Fever'], medicines: [med()], tests: [{ code: 'CBC01', name: 'CBC' }], advice: 'Rest' });
        expect(parseDraft(serializeDraft(d, now), now + 5_000)).toEqual(d);
    });

    it('drops stale, malformed and foreign drafts', () => {
        const d = draft({ medicines: [med()] });
        expect(parseDraft(serializeDraft(d, now), now + DRAFT_MAX_AGE_MS + 1)).toBeNull();
        expect(parseDraft('{not json', now)).toBeNull();
        expect(parseDraft(JSON.stringify({ v: 99, savedAt: now, draft: d }), now)).toBeNull();
        expect(parseDraft(null, now)).toBeNull();
    });

    it('keeps the good lines of a partly corrupted draft', () => {
        const raw = JSON.stringify({
            v: 1,
            savedAt: now,
            draft: { ...draft(), medicines: [med(), { id: 'x', name: 'Bad', dosage: '9-9-9', timing: 'After Food', duration: '1 Day' }] },
        });
        expect(parseDraft(raw, now)?.medicines).toEqual([med()]);
    });

    it('seeds an empty pad from notes saved on the server', () => {
        expect(draftFromNote({ complaints: 'Fever, Cough', findings: null, diagnosis: 'URTI', advice: null })).toEqual(
            draft({ complaints: ['Fever', 'Cough'], diagnosis: 'URTI' }),
        );
        expect(draftFromNote(null)).toEqual(emptyDraft());
    });
});

describe('issuing from the pad (flow)', () => {
    const deps = () => ({
        saveNotes: vi.fn().mockResolvedValue({}),
        issue: vi.fn().mockResolvedValue(issuedRx),
        publish: vi.fn().mockResolvedValue(undefined),
        complete: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
    });

    it('saves notes, issues, broadcasts PRESCRIPTION_ISSUED, then completes — in that order', async () => {
        const d = deps();
        const order: string[] = [];
        d.saveNotes.mockImplementation(async () => order.push('notes'));
        d.issue.mockImplementation(async () => (order.push('issue'), issuedRx));
        d.publish.mockImplementation(async () => void order.push('publish'));
        d.complete.mockImplementation(async () => order.push('complete'));

        const out = await issueFromPad('c-1', draft({ diagnosis: 'URTI', medicines: [med()] }), d);

        expect(order).toEqual(['notes', 'issue', 'publish', 'complete']);
        expect(d.publish).toHaveBeenCalledWith({ v: 1, type: 'PRESCRIPTION_ISSUED', consultationId: 'c-1', prescriptionId: 'rx-1' });
        expect(out).toEqual({ ok: true, prescription: issuedRx, completed: true });
    });

    it('makes no network call when the pad is invalid', async () => {
        const d = deps();
        const out = await issueFromPad('c-1', emptyDraft(), d);
        expect(out.ok).toBe(false);
        expect(d.saveNotes).not.toHaveBeenCalled();
        expect(d.issue).not.toHaveBeenCalled();
    });

    it('skips the notes call when there are no notes', async () => {
        const d = deps();
        await issueFromPad('c-1', draft({ medicines: [med()] }), d);
        expect(d.saveNotes).not.toHaveBeenCalled();
        expect(d.issue).toHaveBeenCalledOnce();
    });

    it('inside a call it does not complete (that would close the room on the patient)', async () => {
        const { complete: _unused, ...inCall } = deps();
        const out = await issueFromPad('c-1', draft({ medicines: [med()] }), inCall);
        expect(out).toEqual({ ok: true, prescription: issuedRx, completed: false });
    });

    it('a failed broadcast or completion does not undo an issued prescription', async () => {
        const d = deps();
        d.publish.mockRejectedValue(new Error('room gone'));
        const err = new Error('409 patient never joined');
        d.complete.mockRejectedValue(err);
        const out = await issueFromPad('c-1', draft({ medicines: [med()] }), d);
        expect(out).toEqual({ ok: true, prescription: issuedRx, completed: false, completeError: err });
    });

    it('a failed issue throws and neither broadcasts nor completes', async () => {
        const d = deps();
        d.issue.mockRejectedValue(new Error('500'));
        await expect(issueFromPad('c-1', draft({ medicines: [med()] }), d)).rejects.toThrow('500');
        expect(d.publish).not.toHaveBeenCalled();
        expect(d.complete).not.toHaveBeenCalled();
    });
});

describe('doctor workspace rules', () => {
    const start = Date.parse('2026-11-02T10:00:00.000Z');
    const record = (over: Partial<DoctorConsultationRecord> = {}): DoctorConsultationRecord => ({
        id: 'c-1',
        status: 'CONFIRMED',
        type: 'VIDEO',
        startsAt: new Date(start).toISOString(),
        patientJoinedAt: null,
        doctorJoinedAt: null,
        slot: { endsAt: new Date(start + 15 * 60_000).toISOString() },
        patient: { name: 'Asha', age: 34, gender: 'F' },
        note: null,
        prescription: null,
        previousVersions: [],
        ...over,
    });

    it('shows "room opens soon" 15 minutes out, then Join once the server window opens', () => {
        expect(primaryAction(record(), start - 30 * 60_000, false)).toEqual({ kind: 'none' });
        expect(primaryAction(record(), start - 14 * 60_000, false)).toEqual({ kind: 'opens-soon', opensAt: new Date(start - 10 * 60_000).toISOString() });
        expect(primaryAction(record(), start - 9 * 60_000, false)).toEqual({ kind: 'join', rejoin: false });
        expect(primaryAction(record({ status: 'IN_PROGRESS', doctorJoinedAt: 'x' }), start, false)).toEqual({ kind: 'join', rejoin: true });
    });

    it('after the visit: write a prescription if none, otherwise view it', () => {
        expect(primaryAction(record({ status: 'COMPLETED' }), start + 60 * 60_000, false)).toEqual({ kind: 'write-rx' });
        expect(primaryAction(record({ status: 'COMPLETED', prescription: issuedRx }), start, false)).toEqual({ kind: 'view-rx' });
    });

    it('polls for the patient only while they may still arrive and the doctor is not in the call', () => {
        expect(presencePollMs(record(), false)).toBe(5_000);
        expect(presencePollMs(record(), true)).toBe(false);
        expect(presencePollMs(record({ status: 'COMPLETED' }), false)).toBe(false);
        expect(presencePollMs(undefined, false)).toBe(false);
    });

    it('detects a waiting patient and labels the live call', () => {
        expect(patientWaiting(record({ status: 'WAITING', patientJoinedAt: 'x' }), false)).toBe(true);
        expect(patientWaiting(record({ status: 'WAITING', patientJoinedAt: 'x' }), true)).toBe(false);
        expect(workspaceBadge(record({ status: 'IN_PROGRESS' }), true)).toEqual({ label: 'In call', tone: 'success' });
        expect(workspaceBadge(record({ status: 'COMPLETED' }), false).label).toBe('Completed');
    });
});
