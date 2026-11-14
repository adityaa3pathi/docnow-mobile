import { describe, expect, it } from 'vitest';

import {
  addButtonView,
  addReducer,
  badgeLabel,
  cartCount,
  countForCode,
  inCartLabel,
  initialAddState,
  personLabel,
  withoutItem,
} from './state';
import type { Cart, CartItem } from './types';

function item(id: string, testCode: string, patient?: CartItem['patient']): CartItem {
  return { id, testCode, testName: `Test ${id}`, price: 500, patient };
}

const cart: Cart = { id: 'cart1', userId: 'u1', items: [item('a', 'package_94'), item('b', 'profile_16'), item('c', 'package_94')] };

describe('cart reads', () => {
  it('counts every line, including the same test twice', () => {
    expect(cartCount(cart)).toBe(3);
    expect(countForCode(cart, 'package_94')).toBe(2);
    expect(countForCode(cart, 'parameter_1')).toBe(0);
  });

  it('treats a missing cart as empty', () => {
    expect(cartCount(null)).toBe(0);
    expect(cartCount(undefined)).toBe(0);
    expect(countForCode(null, 'package_94')).toBe(0);
  });
});

describe('badgeLabel', () => {
  it('hides below one and stops at nine', () => {
    expect(badgeLabel(0)).toBe('');
    expect(badgeLabel(-1)).toBe('');
    expect(badgeLabel(3)).toBe('3');
    expect(badgeLabel(9)).toBe('9');
    expect(badgeLabel(14)).toBe('9+');
  });
});

describe('inCartLabel', () => {
  it('counts only past one', () => {
    expect(inCartLabel(1)).toBe('In cart');
    expect(inCartLabel(2)).toBe('2 in cart');
  });
});

describe('withoutItem', () => {
  it('drops one line and leaves the rest alone', () => {
    const next = withoutItem(cart, 'b');
    expect(next?.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(cart.items).toHaveLength(3);
  });

  it('ignores an id that is not there, and a missing cart', () => {
    expect(withoutItem(cart, 'zz')?.items).toHaveLength(3);
    expect(withoutItem(null, 'a')).toBeNull();
  });
});

describe('personLabel', () => {
  it('names the person and relation when one is assigned', () => {
    expect(personLabel(item('a', 'x', { id: 'p1', name: 'Asha', relation: 'Mother' }))).toBe('Asha · Mother');
    expect(personLabel(item('a', 'x', { id: 'p1', name: 'Asha', relation: '' }))).toBe('Asha');
    expect(personLabel(item('a', 'x'))).toBe('No person chosen yet');
  });
});

describe('addReducer', () => {
  it('ignores a second tap while a request is in flight', () => {
    const adding = addReducer(initialAddState('k1'), { type: 'tap' });
    expect(adding).toEqual({ phase: 'adding', key: 'k1' });
    expect(addReducer(adding, { type: 'tap' })).toBe(adding);
  });

  it('keeps the key after a failure, so a retry cannot add twice', () => {
    const failed = addReducer({ phase: 'adding', key: 'k1' }, { type: 'failed' });
    expect(failed).toEqual({ phase: 'idle', key: 'k1' });
  });

  it('takes a fresh key once an add succeeds, since the next tap is a new line', () => {
    expect(addReducer({ phase: 'adding', key: 'k1' }, { type: 'added', nextKey: 'k2' })).toEqual({ phase: 'added', key: 'k2' });
  });
});

describe('addButtonView', () => {
  it('offers to add when the cart has none', () => {
    expect(addButtonView(0, 'idle')).toEqual({ label: 'Add to cart', busy: false, inCart: false, inCartLabel: 'In cart' });
  });

  it('offers another person once one is in the cart', () => {
    expect(addButtonView(1, 'added')).toEqual({ label: 'Add for another person', busy: false, inCart: true, inCartLabel: 'In cart' });
    expect(addButtonView(2, 'idle').inCartLabel).toBe('2 in cart');
  });

  it('settles as in cart right after an add, before the fresh cart arrives', () => {
    expect(addButtonView(0, 'added')).toEqual({ label: 'Add for another person', busy: false, inCart: true, inCartLabel: 'In cart' });
  });

  it('reads as busy while adding', () => {
    expect(addButtonView(0, 'adding')).toEqual({ label: 'Adding', busy: true, inCart: false, inCartLabel: 'In cart' });
  });
});
