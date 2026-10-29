import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPrecallNotesForTests } from '@/hooks/use-precall-notes';
import { consult } from '@/lib/consult/api';
import { resetServerClockForTests } from '@/lib/consult/time';
import type { BookingView } from '@/lib/consult/types';
import { advanceSeconds, cleanup, flush, render, waitFor } from '@/test-utils/render';
import { WaitingRoom } from './waiting-room';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => void storage.set(k, v)),
    removeItem: vi.fn(async (k: string) => void storage.delete(k)),
  },
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false, canAskAgain: true }, vi.fn(async () => ({ granted: false, canAskAgain: true })), vi.fn()],
}));
vi.mock('expo-audio', () => ({
  RecordingPresets: { LOW_QUALITY: {} },
  getRecordingPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: true })),
  requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: true })),
  setAudioModeAsync: vi.fn(async () => undefined),
  useAudioRecorder: () => ({
    prepareToRecordAsync: vi.fn(async () => undefined),
    record: vi.fn(),
    stop: vi.fn(async () => undefined),
    // A normal speaking voice.
    getStatus: () => ({ metering: -18 }),
  }),
}));

const START = Date.parse('2026-11-02T10:00:00.000Z'); // 3:30 PM IST
const MIN = 60_000;

function booking(over: Partial<BookingView> = {}): BookingView {
  return {
    consultationId: 'c-1',
    status: 'CONFIRMED',
    razorpayOrderId: 'order_1',
    amountPaise: 50000,
    currency: 'INR',
    keyId: null,
    holdExpiresAt: new Date(START - 60 * MIN).toISOString(),
    startsAt: new Date(START).toISOString(),
    endsAt: new Date(START + 15 * MIN).toISOString(),
    doctorId: 'doc-1',
    doctorName: 'Mehta',
    specialty: 'General Physician',
    patientId: 'p-1',
    patientName: 'Asha',
    paymentCaptured: true,
    underStaffCheck: false,
    refundPaise: 0,
    refundStatus: null,
    type: 'VIDEO',
    doctorQualification: 'MBBS, MD',
    doctorJoined: false,
    doctorLateAt: new Date(START + 5 * MIN).toISOString(),
    doctorNoShowAt: new Date(START + 10 * MIN).toISOString(),
    ...over,
  };
}

/** Elements anywhere in the document: the reschedule sheet is a Modal, which renders in a portal. */
const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
async function tap(id: string) {
  const el = $(id);
  if (!el) throw new Error(`No element with testID "${id}"`);
  await act(async () => el.click());
}
/** Types into a react-native-web TextInput the way a keyboard would. */
async function type(id: string, text: string) {
  const el = $(id) as HTMLTextAreaElement | null;
  if (!el) throw new Error(`No input with testID "${id}"`);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function mount(b: BookingView, onResolved = vi.fn(), onJoined = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(
    <Wrapper>
      <WaitingRoom booking={b} join={vi.fn(async () => ({ url: 'wss://x', roomId: 'r', role: 'patient', token: 't' }))} onJoined={onJoined} inCall={false} onResolved={onResolved} />
    </Wrapper>,
  );
}

describe('pre-call waiting room', () => {
  beforeEach(() => {
    storage.clear();
    resetPrecallNotesForTests();
    resetServerClockForTests();
  });
  afterEach(async () => {
    await cleanup();
    vi.useRealTimers();
  });

  it('counts down every second and keeps Join closed until the room opens 10 minutes before', async () => {
    vi.useFakeTimers({ now: START - 12 * MIN - 5_000 });
    await mount(booking());

    expect($('waiting-countdown')?.textContent).toBe('Your consultation starts in 12:05');
    await advanceSeconds(2);
    expect($('waiting-countdown')?.textContent).toBe('Your consultation starts in 12:03');
    expect($('waiting-join')?.getAttribute('aria-disabled')).toBe('true');
    expect($('waiting-join')?.textContent).toContain('Room opens at');

    await advanceSeconds(123); // now 10:00 before the start
    expect($('waiting-join')?.getAttribute('aria-disabled')).not.toBe('true');
    expect($('waiting-join')?.textContent).toBe('Join Consultation');
  });

  it('saves the checklist and the questions for the doctor on this phone, per consultation', async () => {
    vi.useFakeTimers({ now: START - 8 * MIN });
    await mount(booking());
    await flush();

    await tap('check-medicines');
    expect($('check-medicines')?.getAttribute('aria-checked')).toBe('true');
    await type('precall-questions', 'Fever for 3 days. Continue BP tablet?');
    await advanceSeconds(1); // past the 400 ms save delay

    const saved = JSON.parse(storage.get('docnow_precall_c-1') ?? '{}');
    expect(saved).toMatchObject({ checked: ['medicines'], questions: 'Fever for 3 days. Continue BP tablet?' });
  });

  it('shows the pulsing in-room badge, and no delay card, once the doctor has joined', async () => {
    vi.useFakeTimers({ now: START + 7 * MIN });
    await mount(booking({ status: 'WAITING', doctorJoined: true }));
    expect($('doctor-in-room')?.textContent).toBe('Dr. Mehta is in the room and ready for you');
    expect($('delay-card')).toBeNull();
  });

  it('passes the microphone check when it hears the patient', async () => {
    vi.useFakeTimers({ now: START - 8 * MIN });
    await mount(booking());
    await flush();
    const micButton = document.querySelector<HTMLElement>('[aria-label="Test microphone"]')!;
    await act(async () => micButton.click());
    await advanceSeconds(4);
    expect($('tech-mic-status')?.textContent).toBe('✓ Microphone Ready');
  });
});

describe('doctor late resolution', () => {
  beforeEach(() => {
    storage.clear();
    resetPrecallNotesForTests();
    resetServerClockForTests();
  });
  afterEach(async () => {
    await cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('appears once the doctor is 5 minutes late and not in the room', async () => {
    vi.useFakeTimers({ now: START + 4 * MIN });
    await mount(booking({ status: 'WAITING' }));
    expect($('delay-card')).toBeNull();

    await advanceSeconds(61);
    expect($('delay-card')?.textContent).toContain('Dr. Mehta is running about 5 minutes late');
    expect($('delay-elapsed')?.textContent).toBe('⏱ 05:01 past your start time');
    expect($('delay-card')?.textContent).toContain('Doctors occasionally run late with emergency patients.');
  });

  it('Continue Waiting collapses to a live status bar that can reopen the options', async () => {
    vi.useFakeTimers({ now: START + 6 * MIN });
    await mount(booking({ status: 'WAITING' }));
    await tap('delay-continue');
    expect($('delay-card')).toBeNull();
    expect($('delay-waiting')?.textContent).toContain('06:00');
    await advanceSeconds(3);
    expect($('delay-waiting')?.textContent).toContain('06:03');
  });

  it('reschedules for free: picks a slot from the sheet and calls the reschedule API', async () => {
    vi.useFakeTimers({ now: START + 6 * MIN, toFake: ['Date', 'setInterval', 'clearInterval'] });
    const slots = [
      { id: 'slot-1', startsAt: new Date(START + 26 * 60 * MIN).toISOString(), endsAt: new Date(START + 26 * 60 * MIN + 15 * MIN).toISOString() },
      { id: 'slot-2', startsAt: new Date(START + 27 * 60 * MIN).toISOString(), endsAt: new Date(START + 27 * 60 * MIN + 15 * MIN).toISOString() },
    ];
    vi.spyOn(consult, 'rescheduleSlots').mockResolvedValue(slots);
    const reschedule = vi.spyOn(consult, 'reschedule').mockResolvedValue(booking({ startsAt: slots[1].startsAt }));
    const onResolved = vi.fn();
    await mount(booking({ status: 'WAITING' }), onResolved);

    await tap('delay-reschedule');
    await waitFor(() => expect($('reschedule-slot-slot-2')).not.toBeNull());
    expect($('reschedule-confirm')?.getAttribute('aria-disabled')).toBe('true');
    await tap('reschedule-slot-slot-2');
    await tap('reschedule-confirm');
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith('rescheduled'));

    expect(reschedule).toHaveBeenCalledWith('c-1', 'slot-2');
  });

  it('offers the next available doctor and switches on confirm', async () => {
    vi.useFakeTimers({ now: START + 6 * MIN, toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.spyOn(consult, 'reassignOption').mockResolvedValue({
      slot: { id: 'slot-n', startsAt: new Date(START + 15 * MIN).toISOString(), endsAt: new Date(START + 30 * MIN).toISOString() },
      doctor: { id: 'doc-2', displayName: 'Rao', photoUrl: null, qualification: 'MBBS', experienceYears: 8, languages: ['English'], consultationFee: 500, specialty: 'General Physician' },
    });
    const reassign = vi.spyOn(consult, 'reassign').mockResolvedValue(booking({ doctorId: 'doc-2', doctorName: 'Rao' }));
    const onResolved = vi.fn();
    await mount(booking({ status: 'WAITING' }), onResolved);

    await tap('delay-reassign');
    await waitFor(() => expect($('reassign-offer')?.textContent).toContain('Dr. Rao'));
    await tap('reassign-confirm');
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith('reassigned'));
    expect(reassign).toHaveBeenCalledWith('c-1', 'slot-n');
  });

  it('requests the 100% refund with reason DOCTOR_LATE and shows the refund status and ETA', async () => {
    vi.useFakeTimers({ now: START + 6 * MIN, toFake: ['Date', 'setInterval', 'clearInterval'] });
    const cancel = vi.spyOn(consult, 'cancel').mockResolvedValue({ status: 'CANCELLED', refundPaise: 50000, refundStatus: 'PENDING' });
    const onResolved = vi.fn();
    await mount(booking({ status: 'WAITING' }), onResolved);

    await tap('delay-refund');
    expect($('refund-confirm-box')?.textContent).toContain('refund ₹500 in full');
    expect(cancel).not.toHaveBeenCalled();
    await tap('delay-refund-confirm');
    await waitFor(() => expect($('delay-refunded')).not.toBeNull());

    expect(cancel).toHaveBeenCalledWith('c-1', 'DOCTOR_LATE');
    expect($('delay-refunded')?.textContent).toContain('Full refund of ₹500 started.');
    expect($('delay-refunded')?.textContent).toContain('5–7 working days');
    await tap('delay-refund-done');
    expect(onResolved).toHaveBeenCalledWith('refunded');
  });

  it('shows the server refusal (e.g. the doctor just joined) instead of a confirmation', async () => {
    vi.useFakeTimers({ now: START + 6 * MIN, toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.spyOn(consult, 'cancel').mockRejectedValue(new Error('409'));
    await mount(booking({ status: 'WAITING' }));
    await tap('delay-refund');
    await tap('delay-refund-confirm');
    await waitFor(() => expect($('delay-card')?.textContent).toContain('We could not cancel your consultation.'));
    expect($('delay-refunded')).toBeNull();
  });
});
