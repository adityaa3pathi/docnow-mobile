import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consult } from '@/lib/consult/api';
import type { Prescription } from '@/lib/consult/types';
import { cartApi } from '@/lib/tests/api';
import { CartProvider, useCart } from '@/lib/tests/cart-context';
import { createCartBackend, USER_ID } from '@/test-utils/fixtures';
import { cleanup, render, waitFor } from '@/test-utils/render';
import { PatientPrescription } from './patient-prescription';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: USER_ID, name: 'Rahul', mobile: '9999999999' }, loading: false }) }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }));

const RX = {
  id: 'rx-1',
  consultationId: 'c-1',
  version: 1,
  medicines: [{ name: 'Paracetamol 650mg', dose: '', frequency: '1-0-1', duration: '5 Days', instructions: 'After Food' }],
  recommendedTests: [
    { code: 'CBC', name: 'Complete Blood Count' },
    { code: 'LIPID', name: 'Lipid Profile' },
  ],
  advice: null,
  doctorSnapshot: { displayName: 'Mehta', qualification: 'MBBS', registrationNumber: 'R-1', registrationCouncil: 'DMC', specialty: 'GP' },
  patientSnapshot: { name: 'Rahul', age: 34, gender: 'M' },
  issuedAt: '2026-10-29T10:00:00.000Z',
} as Prescription;

/** Stands in for the header badge / cart tab: anything else reading the shared cart. */
function CartBadge() {
  const { cartCount } = useCart();
  return <Text testID="cart-badge">{String(cartCount)}</Text>;
}

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
}

describe('prescription → cart → checkout funnel', () => {
  let backend: ReturnType<typeof createCartBackend>;

  beforeEach(() => {
    backend = createCartBackend();
    vi.spyOn(cartApi, 'get').mockImplementation(() => backend.get());
    vi.spyOn(consult, 'prescription').mockResolvedValue(RX);
  });
  afterEach(cleanup);

  const mount = () =>
    render(
      <Providers>
        <PatientPrescription bookingId="c-1" />
        <CartBadge />
      </Providers>,
    );

  it('adds every test, syncs the shared cart count, and goes straight to slot selection', async () => {
    vi.spyOn(consult, 'addTestsToCart').mockImplementation(async () => {
      await backend.addItem('CBC', 'patient-self');
      await backend.addItem('LIPID', 'patient-self');
      return { added: ['CBC', 'LIPID'], skipped: [] };
    });
    const ui = await mount();
    await waitFor(() => ui.getByTestId('rx-book-all'));
    expect(ui.getByTestId('cart-badge').textContent).toBe('0');

    await ui.press('rx-book-all');
    await waitFor(() => ui.getByTestId('rx-cart-funnel'));

    expect(ui.getByTestId('cart-badge').textContent).toBe('2');
    const funnel = ui.getByTestId('rx-cart-funnel').textContent;
    expect(funnel).toContain('✓ Added 2 tests to your cart');
    expect(funnel).toContain('Complete Blood Count');
    expect(funnel).toContain('Lipid Profile');
    expect(ui.getByTestId('rx-book-all').textContent).toContain('In Cart');

    await ui.press('rx-cart-cta');
    expect(router.push).toHaveBeenCalledWith('/tests/checkout');
  });

  it('switches to "View in Cart & Checkout" when some tests were already in the cart', async () => {
    vi.spyOn(consult, 'addTestsToCart').mockResolvedValue({ added: ['CBC'], skipped: [{ code: 'LIPID', reason: 'Already in cart' }] });
    const ui = await mount();
    await waitFor(() => ui.getByTestId('rx-book-all'));
    await ui.press('rx-book-all');
    await waitFor(() => ui.getByTestId('rx-cart-cta'));

    expect(ui.getByTestId('rx-cart-cta').textContent).toBe('View in Cart & Checkout →');
    expect(ui.getByTestId('rx-cart-funnel').textContent).toContain('Lipid Profile · in cart');
    await ui.press('rx-cart-cta');
    expect(router.push).toHaveBeenCalledWith('/(tabs)/tests');
  });

  it('shows the error and no checkout button when adding fails', async () => {
    vi.spyOn(consult, 'addTestsToCart').mockRejectedValue(new Error('Network Error'));
    const ui = await mount();
    await waitFor(() => ui.getByTestId('rx-book-all'));
    await ui.press('rx-book-all');
    await waitFor(() => expect(ui.container.textContent).toContain('Could not add tests to cart.'));
    expect(ui.queryByTestId('rx-cart-cta')).toBeNull();
  });
});
