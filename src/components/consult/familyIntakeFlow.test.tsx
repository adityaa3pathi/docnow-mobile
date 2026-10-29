import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { act, useState, type ReactNode } from 'react';
import { Share, Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consult, type Person } from '@/lib/consult/api';
import { bookingExtras, intakeFromPerson, type IntakeDraft } from '@/lib/consult/family';
import type { BookingView, Prescription } from '@/lib/consult/types';
import { bookingsApi, cartApi } from '@/lib/tests/api';
import { CartProvider } from '@/lib/tests/cart-context';
import { createCartBackend, USER_ID } from '@/test-utils/fixtures';
import { cleanup, render, waitFor } from '@/test-utils/render';
import { BookingCard } from './booking-card';
import { FamilyAcceptCard, ShareCallLinkButton } from './family-access';
import { FamilyIntakeSheet } from './family-intake-sheet';
import { PatientPrescription } from './patient-prescription';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: USER_ID, name: 'Sunita', mobile: '9876543210' }, loading: false }) }));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
}));

const MOTHER: Person = {
  id: 'p-mother',
  name: 'Sunita Verma',
  relation: 'Parent',
  age: 64,
  gender: 'Female',
  phone: '9876543210',
  preferredLanguage: 'hi',
  chronicConditions: ['Diabetes'],
  allergies: [],
  currentMedications: ['Metformin 500mg'],
};

const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
async function tap(el: Element | null) {
  if (!el) throw new Error('Element not found');
  await act(async () => (el as HTMLElement).click());
}

function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

/** Holds the draft like the booking screen does and shows it for assertions. */
function IntakeHarness({ person }: { person: Person }) {
  const [draft, setDraft] = useState<IntakeDraft>(() => intakeFromPerson(person));
  return (
    <>
      <FamilyIntakeSheet person={person} value={draft} onChange={setDraft} />
      <Text testID="draft">{JSON.stringify(draft)}</Text>
    </>
  );
}
const draft = (): IntakeDraft => JSON.parse($('draft')?.textContent ?? '{}');

function familyBooking(over: Partial<BookingView> = {}): BookingView {
  return {
    consultationId: 'c-1',
    status: 'CONFIRMED',
    razorpayOrderId: null,
    amountPaise: 0,
    currency: 'INR',
    keyId: null,
    holdExpiresAt: '2026-11-02T09:00:00.000Z',
    startsAt: '2026-11-02T10:00:00.000Z',
    endsAt: '2026-11-02T10:15:00.000Z',
    doctorId: 'doc-1',
    doctorName: 'Sharma',
    specialty: 'General Physician',
    patientId: 'p-mother',
    patientName: 'Sunita Verma',
    paymentCaptured: true,
    underStaffCheck: false,
    refundPaise: 0,
    refundStatus: null,
    isBookedForYou: true,
    bookedBy: { name: 'Aditya Verma', relation: 'Parent' },
    familyAccess: 'linked',
    ...over,
  };
}

afterEach(async () => {
  await cleanup();
  vi.restoreAllMocks();
});

describe('family intake sheet', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'list').mockResolvedValue([]);
  });

  it('pre-fills the family member phone (formatted beside +91) and their saved health snapshot', async () => {
    await render(withQuery(<IntakeHarness person={MOTHER} />));
    expect(($('intake-phone') as HTMLInputElement).value).toBe('98765 43210');
    expect($('intake-condition-Diabetes')?.getAttribute('aria-checked')).toBe('true');
    expect($('intake-lang-hi')?.getAttribute('aria-checked')).toBe('true');
    expect(draft().currentMedications).toEqual(['Metformin 500mg']);
  });

  it('toggles chronic conditions, with "None" clearing the others and vice versa', async () => {
    await render(withQuery(<IntakeHarness person={MOTHER} />));

    await tap($('intake-condition-Hypertension'));
    expect(draft().chronicConditions).toEqual(['Diabetes', 'Hypertension']);
    await tap($('intake-condition-Diabetes'));
    expect(draft().chronicConditions).toEqual(['Hypertension']);

    await tap($('intake-condition-None'));
    expect(draft().chronicConditions).toEqual(['None']);
    expect($('intake-condition-Hypertension')?.getAttribute('aria-checked')).toBe('false');
    await tap($('intake-condition-Thyroid'));
    expect(draft().chronicConditions).toEqual(['Thyroid']);
  });

  it('has the caregiver co-join switch on by default, and turns it off', async () => {
    await render(withQuery(<IntakeHarness person={MOTHER} />));
    expect(draft().isCaregiverJoined).toBe(true);
    const input = $('intake-cojoin')?.querySelector('input') ?? $('intake-cojoin');
    await tap(input);
    expect(draft().isCaregiverJoined).toBe(false);
  });

  it('tells the booker when there are no DocNow reports to share', async () => {
    await render(withQuery(<IntakeHarness person={{ ...MOTHER, phone: null }} />));
    await waitFor(() => expect($('family-intake')?.textContent).toContain('No DocNow lab reports yet'));
    expect(($('intake-phone') as HTMLInputElement).value).toBe('');
  });
});

describe('booked for you', () => {
  it('shows the consultation card as booked for the family member, without the payment', async () => {
    await render(<BookingCard booking={familyBooking()} />);
    expect($('booked-for-you-badge')?.textContent).toBe('👪 Booked for you by Aditya');
    expect(document.body.textContent).not.toContain('₹');
  });

  it('asks a family member who has not confirmed yet to confirm', async () => {
    await render(<BookingCard booking={familyBooking({ familyAccess: 'pending' })} />);
    expect(document.body.textContent).toContain("Confirm it's you to join");
  });

  it('accepting calls the API for that person and reports back', async () => {
    const accept = vi.spyOn(consult, 'acceptFamily').mockResolvedValue({ patientId: 'p-mother', linked: true });
    const onDone = vi.fn();
    await render(withQuery(<FamilyAcceptCard booking={familyBooking({ familyAccess: 'pending' })} onDone={onDone} />));
    expect($('family-accept')?.textContent).toContain('Booked for you by Aditya');
    await tap($('family-accept-yes'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(accept).toHaveBeenCalledWith('p-mother');
  });

  it('gives the family member the prescription with the "Book All Tests" button', async () => {
    const backend = createCartBackend();
    vi.spyOn(cartApi, 'get').mockImplementation(() => backend.get());
    vi.spyOn(consult, 'prescription').mockResolvedValue({
      id: 'rx-1',
      consultationId: 'c-1',
      version: 1,
      medicines: [{ name: 'Metformin 500mg', dose: '', frequency: '1-0-1 (morning, night)', duration: '30 Days', instructions: 'After Food' }],
      recommendedTests: [{ code: 'HBA1C', name: 'HbA1c' }],
      advice: null,
      doctorSnapshot: { displayName: 'Dr. Sharma', qualification: 'MBBS', registrationNumber: 'R-1', registrationCouncil: 'DMC', specialty: 'GP' },
      patientSnapshot: { name: 'Sunita Verma', age: 64, gender: 'Female' },
      issuedAt: '2026-11-02T10:20:00.000Z',
    } as Prescription);

    await render(withQuery(<CartProvider><PatientPrescription bookingId="c-1" /></CartProvider>));
    await waitFor(() => expect($('rx-book-all')).not.toBeNull());
    expect($('rx-book-all')?.textContent).toBe('Book All Tests');
    expect(document.body.textContent).toContain('Download PDF');
  });
});

// ── Attach Past Records: camera / gallery uploads ──────

const photo = (n: number, over: Partial<ImagePicker.ImagePickerAsset> = {}) =>
  ({ uri: `file:///photo-${n}.jpg`, fileName: `old-prescription-${n}.jpg`, mimeType: 'image/jpeg', fileSize: 200_000, width: 1000, height: 1400, ...over }) as ImagePicker.ImagePickerAsset;
const uploaded = (id: string, name: string) => ({ id, name, mimeType: 'image/jpeg', sizeBytes: 200_000, uploadedAt: '2026-11-01T10:00:00.000Z', url: `https://s3.test/${id}` });
const chip = (n: number) => $(`intake-doc-file:///photo-${n}.jpg`);

describe('attach past records', () => {
  beforeEach(() => {
    vi.spyOn(bookingsApi, 'list').mockResolvedValue([]);
    vi.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true } as never);
    vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true } as never);
  });

  it('takes a photo, uploads it, shows a thumbnail chip and puts it in the booking payload', async () => {
    vi.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [photo(1)] });
    const upload = vi.spyOn(consult, 'uploadAttachment').mockResolvedValue(uploaded('att-1', 'old-prescription-1.jpg'));
    await render(withQuery(<IntakeHarness person={MOTHER} />));

    await tap($('intake-take-photo'));
    await waitFor(() => expect(draft().documents[0]?.status).toBe('ready'));

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'] }));
    expect(upload).toHaveBeenCalledWith({ uri: 'file:///photo-1.jpg', name: 'old-prescription-1.jpg', mimeType: 'image/jpeg' });
    expect(chip(1)).not.toBeNull();
    expect(bookingExtras(draft())).toEqual({ isCaregiverJoined: true, attachmentIds: ['att-1'] });
  });

  it('removes an attachment chip and deletes the unclaimed upload', async () => {
    vi.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [photo(1)] });
    vi.spyOn(consult, 'uploadAttachment').mockResolvedValue(uploaded('att-1', 'old-prescription-1.jpg'));
    const remove = vi.spyOn(consult, 'removeAttachment').mockResolvedValue({ id: 'att-1', removed: true });
    await render(withQuery(<IntakeHarness person={MOTHER} />));
    await tap($('intake-take-photo'));
    await waitFor(() => expect(draft().documents[0]?.status).toBe('ready'));

    await tap($('intake-doc-remove-file:///photo-1.jpg'));

    expect(chip(1)).toBeNull();
    expect(draft().documents).toEqual([]);
    expect(remove).toHaveBeenCalledWith('att-1');
    expect(bookingExtras(draft())).not.toHaveProperty('attachmentIds');
  });

  it('uploads several from the gallery and leaves a failed one out of the booking', async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [photo(1), photo(2)] });
    vi.spyOn(consult, 'uploadAttachment')
      .mockResolvedValueOnce(uploaded('att-1', 'old-prescription-1.jpg'))
      .mockRejectedValueOnce(new Error('Network Error'));
    await render(withQuery(<IntakeHarness person={MOTHER} />));

    await tap($('intake-pick-gallery'));
    await waitFor(() => expect(draft().documents.map((d) => d.status)).toEqual(['ready', 'failed']));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 5 }));
    expect(chip(1)).not.toBeNull();
    expect(chip(2)).not.toBeNull();
    expect(bookingExtras(draft()).attachmentIds).toEqual(['att-1']);
  });

  it('refuses a photo over 10 MB without uploading it', async () => {
    vi.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [photo(1, { fileSize: 11 * 1024 * 1024 })] });
    const upload = vi.spyOn(consult, 'uploadAttachment');
    await render(withQuery(<IntakeHarness person={MOTHER} />));
    await tap($('intake-take-photo'));
    await waitFor(() => expect(draft().documents[0]?.status).toBe('failed'));
    expect(upload).not.toHaveBeenCalled();
  });

  it('points to Settings when the camera is blocked, and opens nothing', async () => {
    vi.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
    await render(withQuery(<IntakeHarness person={MOTHER} />));
    await tap($('intake-take-photo'));
    await waitFor(() => expect($('family-intake')?.textContent).toContain('Turn it on in Settings'));
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('share call link', () => {
  it('opens the share sheet with the zero-install call link', async () => {
    const share = vi.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await render(<ShareCallLinkButton booking={{ doctorName: 'Sharma', patientName: 'Sunita Verma', guestJoinUrl: 'https://docnow.in/call/g-1' }} />);

    expect($('share-call-link')?.textContent).toBe('🔗 Share Call Link with Sunita');
    await tap($('share-call-link'));

    expect(share).toHaveBeenCalledWith({ message: 'Namaste! Dr. Sharma consultation link: https://docnow.in/call/g-1', url: 'https://docnow.in/call/g-1' });
  });

  it('is not shown without a call link', async () => {
    await render(<ShareCallLinkButton booking={{ doctorName: 'Sharma', patientName: 'Sunita', guestJoinUrl: null }} />);
    expect($('share-call-link')).toBeNull();
  });
});

