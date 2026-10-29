import { describe, expect, it } from 'vitest';

import { pickInitialAddress } from './address';
import type { Address } from './types';

const addr = (id: string, isDeleted = false) => ({ id, userId: 'u', line1: `${id} street`, city: 'Lucknow', pincode: '226001', lat: null, long: null, isDeleted }) as unknown as Address;

describe('checkout starting address', () => {
  it('uses the suggested address from "Book All Tests" when it is still saved', () => {
    expect(pickInitialAddress([addr('home'), addr('mother')], 'mother')?.id).toBe('mother');
  });

  it('falls back to the first saved address if the suggestion was deleted or missing', () => {
    expect(pickInitialAddress([addr('home'), addr('mother', true)], 'mother')?.id).toBe('home');
    expect(pickInitialAddress([addr('home')], null)?.id).toBe('home');
  });

  it('returns none when nothing is saved, so checkout asks for an address', () => {
    expect(pickInitialAddress([], 'mother')).toBeNull();
    expect(pickInitialAddress([addr('old', true)], null)).toBeNull();
  });
});
