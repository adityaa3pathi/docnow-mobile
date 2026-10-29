import { describe, expect, it, vi } from 'vitest';
import { calculateCollectionFee, SAMPLE_COLLECTION_FEE, SAMPLE_COLLECTION_FEE_THRESHOLD } from './api';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('Test Booking API logic', () => {
  it('calculates zero collection fee when cart subtotal is zero', () => {
    expect(calculateCollectionFee(0)).toBe(0);
    expect(calculateCollectionFee(-10)).toBe(0);
  });

  it('charges sample collection fee when subtotal is below threshold (₹500)', () => {
    expect(calculateCollectionFee(499)).toBe(SAMPLE_COLLECTION_FEE);
    expect(calculateCollectionFee(150)).toBe(129);
  });

  it('waives sample collection fee when subtotal is at or above threshold', () => {
    expect(calculateCollectionFee(SAMPLE_COLLECTION_FEE_THRESHOLD)).toBe(0);
    expect(calculateCollectionFee(500)).toBe(0);
    expect(calculateCollectionFee(1299)).toBe(0);
  });
});
