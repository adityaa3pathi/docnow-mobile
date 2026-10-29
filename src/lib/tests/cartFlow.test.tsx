import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CATALOG, createCartBackend, USER_ID } from '@/test-utils/fixtures';
import { cleanup, deferred, flush, renderHook } from '@/test-utils/render';
import { cartApi } from './api';
import { CartProvider, useCart } from './cart-context';
import type { Cart } from './types';

const MOCK_USER = { id: USER_ID, name: 'Rahul Verma', mobile: '9999999999', role: 'USER' as const };

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: MOCK_USER,
    loading: false,
  }),
}));

describe('Cart Flow & Multi-Consumer Sync', () => {
  let backend: ReturnType<typeof createCartBackend>;

  beforeEach(() => {
    backend = createCartBackend();
    vi.spyOn(cartApi, 'get').mockImplementation(() => backend.get());
    vi.spyOn(cartApi, 'addItem').mockImplementation((code, patientId) => backend.addItem(code, patientId));
    vi.spyOn(cartApi, 'assignPatient').mockImplementation((itemId, patientId) =>
      backend.assignPatient(itemId, patientId),
    );
    vi.spyOn(cartApi, 'removeItem').mockImplementation((itemId) => backend.removeItem(itemId));
    vi.spyOn(cartApi, 'clear').mockImplementation(() => backend.clear());
  });

  afterEach(async () => {
    await cleanup();
  });

  it('allows adding duplicate tests for multiple family members with distinct patient assignments', async () => {
    const { result } = await renderHook(() => useCart(), CartProvider);
    await flush();

    expect(result.current.cartCount).toBe(0);
    expect(result.current.getItemCount('CBC')).toBe(0);

    // 1. Add first CBC test
    let success = false;
    await act(async () => {
      success = await result.current.addToCart('CBC');
    });
    expect(success).toBe(true);
    expect(result.current.cartCount).toBe(1);
    expect(result.current.getItemCount('CBC')).toBe(1);
    const firstItem = result.current.items[0];
    expect(firstItem.testCode).toBe('CBC');
    expect(firstItem.patientId).toBeNull();

    // 2. Add second duplicate CBC test (for another family member)
    await act(async () => {
      success = await result.current.addToCart('CBC');
    });
    expect(success).toBe(true);
    expect(result.current.cartCount).toBe(2);
    expect(result.current.getItemCount('CBC')).toBe(2);
    const secondItem = result.current.items[1];
    expect(secondItem.testCode).toBe('CBC');
    expect(secondItem.id).not.toBe(firstItem.id);

    // 3. Assign first CBC to SELF
    await act(async () => {
      success = await result.current.assignPatient(firstItem.id, 'patient-self');
    });
    expect(success).toBe(true);
    expect(result.current.items[0].patientId).toBe('patient-self');
    expect(result.current.items[0].patient?.relation).toBe('SELF');
    expect(result.current.items[1].patientId).toBeNull();

    // 4. Assign second CBC to MOTHER
    await act(async () => {
      success = await result.current.assignPatient(secondItem.id, 'patient-mother');
    });
    expect(success).toBe(true);
    expect(result.current.items[0].patientId).toBe('patient-self');
    expect(result.current.items[1].patientId).toBe('patient-mother');
    expect(result.current.items[1].patient?.relation).toBe('MOTHER');

    // 5. Unassign patient from first CBC
    await act(async () => {
      success = await result.current.assignPatient(firstItem.id, null);
    });
    expect(success).toBe(true);
    expect(result.current.items[0].patientId).toBeNull();
    expect(result.current.items[1].patientId).toBe('patient-mother');

    // 6. Remove first item - second item remains untouched
    await act(async () => {
      success = await result.current.removeFromCart(firstItem.id);
    });
    expect(success).toBe(true);
    expect(result.current.cartCount).toBe(1);
    expect(result.current.getItemCount('CBC')).toBe(1);
    expect(result.current.items[0].id).toBe(secondItem.id);
    expect(result.current.items[0].patientId).toBe('patient-mother');
  });

  it('synchronizes cart state across multiple consumers simultaneously without tearing', async () => {
    // Hook combining two simultaneous consumers (e.g. Header cart badge & floating bar)
    const { result } = await renderHook(
      () => {
        const headerConsumer = useCart();
        const floatingBarConsumer = useCart();
        return { header: headerConsumer, bar: floatingBarConsumer };
      },
      CartProvider,
    );
    await flush();

    // Both start in sync with empty cart
    expect(result.current.header.cartCount).toBe(0);
    expect(result.current.bar.cartCount).toBe(0);

    // Add an item
    await act(async () => {
      await result.current.header.addToCart('LIPID');
    });

    // Verify both consumers updated to exactly 1 item
    expect(result.current.header.cartCount).toBe(1);
    expect(result.current.bar.cartCount).toBe(1);
    expect(result.current.header.getItemCount('LIPID')).toBe(1);
    expect(result.current.bar.getItemCount('LIPID')).toBe(1);
    expect(result.current.header.items).toBe(result.current.bar.items);

    // Verify every committed render had identical counts across both consumers (no tearing)
    for (const commit of result.commits) {
      expect(commit.header.cartCount).toBe(commit.bar.cartCount);
      expect(commit.header.mutating).toBe(commit.bar.mutating);
    }
  });

  it('drops out-of-order mutation responses to prevent rolling the cart backwards (Finding F2)', async () => {
    const { result } = await renderHook(() => useCart(), CartProvider);
    await flush();

    const d1 = deferred<Cart>();
    const d2 = deferred<Cart>();
    let callIndex = 0;

    vi.spyOn(cartApi, 'addItem').mockImplementation(async () => {
      callIndex += 1;
      if (callIndex === 1) return d1.promise;
      return d2.promise;
    });

    // Trigger mutation 1 (slow)
    let p1!: Promise<boolean>;
    act(() => {
      p1 = result.current.addToCart('CBC');
    });

    // Trigger mutation 2 (fast)
    let p2!: Promise<boolean>;
    act(() => {
      p2 = result.current.addToCart('LIPID');
    });

    expect(result.current.mutating).toBe(true);

    // Newer mutation 2 resolves FIRST with a 2-item cart
    const twoItemsCart: Cart = {
      id: 'cart-1',
      userId: USER_ID,
      lastActivityAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          testCode: 'CBC',
          testName: CATALOG.CBC.testName,
          price: CATALOG.CBC.price,
          mrp: CATALOG.CBC.mrp,
          patientId: null,
          patient: null,
        },
        {
          id: 'item-2',
          cartId: 'cart-1',
          testCode: 'LIPID',
          testName: CATALOG.LIPID.testName,
          price: CATALOG.LIPID.price,
          mrp: CATALOG.LIPID.mrp,
          patientId: null,
          patient: null,
        },
      ],
    };

    await act(async () => {
      d2.resolve(twoItemsCart);
      await p2;
    });

    expect(result.current.cartCount).toBe(2);

    // Older mutation 1 resolves LATER with a stale 1-item snapshot
    const staleCart: Cart = {
      id: 'cart-1',
      userId: USER_ID,
      lastActivityAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          cartId: 'cart-1',
          testCode: 'CBC',
          testName: CATALOG.CBC.testName,
          price: CATALOG.CBC.price,
          mrp: CATALOG.CBC.mrp,
          patientId: null,
          patient: null,
        },
      ],
    };

    await act(async () => {
      d1.resolve(staleCart);
      await p1;
    });

    // Stale response must be dropped: cart remains at 2 items!
    expect(result.current.cartCount).toBe(2);
    expect(result.current.items.length).toBe(2);
    expect(result.current.items[1].testCode).toBe('LIPID');
  });

  it('handles clearCart correctly', async () => {
    const { result } = await renderHook(() => useCart(), CartProvider);
    await flush();

    await act(async () => {
      await result.current.addToCart('CBC');
      await result.current.addToCart('LIPID');
    });
    expect(result.current.cartCount).toBe(2);

    await act(async () => {
      await result.current.clearCart();
    });

    expect(result.current.cartCount).toBe(0);
    expect(result.current.items).toEqual([]);
  });
});
