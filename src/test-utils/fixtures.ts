import type { Address, Cart, CartItem, Slot } from '@/lib/tests/types';

export const USER_ID = 'user-1';
export const CART_ID = 'cart-1';

export const PATIENTS: Record<string, NonNullable<CartItem['patient']>> = {
  'patient-self': { id: 'patient-self', name: 'Rahul Verma', relation: 'SELF', age: 34, gender: 'M' },
  'patient-mother': { id: 'patient-mother', name: 'Sunita Verma', relation: 'MOTHER', age: 61, gender: 'F' },
};

export const CATALOG: Record<string, { testName: string; price: number; mrp: number }> = {
  CBC: { testName: 'Complete Blood Count', price: 299, mrp: 450 },
  LIPID: { testName: 'Lipid Profile', price: 549, mrp: 900 },
};

/**
 * In-memory cart backend with the same semantics as the real API: every add creates a new line
 * item (item-1, item-2, …) even for a duplicate testCode, and every call returns the full cart.
 */
export function createCartBackend() {
  let nextItem = 0;
  let clock = Date.parse('2026-11-02T04:30:00.000Z');
  const cart: Cart = { id: CART_ID, userId: USER_ID, lastActivityAt: new Date(clock).toISOString(), items: [] };

  const touch = () => {
    clock += 1000;
    cart.lastActivityAt = new Date(clock).toISOString();
  };
  const snapshot = (): Cart => structuredClone(cart);
  const findItem = (itemId: string) => {
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`404: cart item ${itemId} not found`);
    return item;
  };

  return {
    snapshot,
    get: async (): Promise<Cart> => snapshot(),
    addItem: async (testCode: string, patientId?: string): Promise<Cart> => {
      const entry = CATALOG[testCode];
      if (!entry) throw new Error(`400: unknown test ${testCode}`);
      nextItem += 1;
      cart.items.push({
        id: `item-${nextItem}`,
        cartId: CART_ID,
        testCode,
        testName: entry.testName,
        price: entry.price,
        mrp: entry.mrp,
        patientId: patientId ?? null,
        patient: patientId ? PATIENTS[patientId] : null,
      });
      touch();
      return snapshot();
    },
    assignPatient: async (itemId: string, patientId: string | null): Promise<Cart> => {
      const item = findItem(itemId);
      item.patientId = patientId;
      item.patient = patientId ? PATIENTS[patientId] : null;
      touch();
      return snapshot();
    },
    removeItem: async (itemId: string): Promise<Cart> => {
      findItem(itemId);
      cart.items = cart.items.filter((i) => i.id !== itemId);
      touch();
      return snapshot();
    },
    clear: async (): Promise<void> => {
      cart.items = [];
      touch();
    },
  };
}

export function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    userId: USER_ID,
    line1: 'Flat 402, Sea Breeze Apartments, Bandra West',
    city: 'Mumbai',
    pincode: '400050',
    lat: '19.0760',
    long: '72.8777',
    isDeleted: false,
    ...overrides,
  };
}

export const SELECTED_DATE = '2026-11-02';

export const SLOTS: Slot[] = [
  { stm_id: 'stm-101', slot_time: '07:00', display_time: '7:00 AM - 8:00 AM', slot_date: SELECTED_DATE, is_fasting: true },
  { stm_id: 'stm-102', slot_time: '08:00', display_time: '8:00 AM - 9:00 AM', slot_date: SELECTED_DATE, is_fasting: true },
  { stm_id: 'stm-103', slot_time: '17:00', display_time: '5:00 PM - 6:00 PM', slot_date: SELECTED_DATE, is_fasting: false },
];

export const DELHI_FALLBACK = { lat: '28.6139', long: '77.2090' } as const;
