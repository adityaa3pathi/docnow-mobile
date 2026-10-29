import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, useState, type ReactNode } from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consult, type Person } from '@/lib/consult/api';
import { intakeFromPerson, type IntakeDraft } from '@/lib/consult/family';
import type { BookingView, Prescription } from '@/lib/consult/types';
import { bookingsApi, cartApi } from '@/lib/tests/api';
import { CartProvider } from '@/lib/tests/cart-context';
import { createCartBackend, USER_ID } from '@/test-utils/fixtures';
import { cleanup, render, waitFor } from '@/test-utils/render';
import { BookingCard } from './booking-card';
import { FamilyAcceptCard } from './family-access';
import { FamilyIntakeSheet } from './family-intake-sheet';
import { PatientPrescription } from './patient-prescription';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: USER_ID, name: 'Sunita', mobile: '9876543210' }, loading: false }) }));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }));

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
