/** Pure cart reads and the add-button state machine. No network, no React, so it is all testable. */
import type { Cart, CartItem } from './types';

export function cartItems(cart: Cart | null | undefined): CartItem[] {
  return cart?.items ?? [];
}

export function cartCount(cart: Cart | null | undefined): number {
  return cartItems(cart).length;
}

/** The same test can sit in the cart once per person, so this is a count and not a flag. */
export function countForCode(cart: Cart | null | undefined, testCode: string): number {
  return cartItems(cart).filter((item) => item.testCode === testCode).length;
}

/** Badge text. Empty string means no badge; past nine it stops growing. */
export function badgeLabel(count: number): string {
  if (count < 1) return '';
  return count > 9 ? '9+' : String(count);
}

export function inCartLabel(count: number): string {
  return count > 1 ? `${count} in cart` : 'In cart';
}

/** Drops a removed line straight away, so the row disappears before the server replies. */
export function withoutItem(cart: Cart | null | undefined, itemId: string): Cart | null {
  if (!cart) return null;
  return { ...cart, items: cartItems(cart).filter((item) => item.id !== itemId) };
}

export function personLabel(item: CartItem): string {
  if (!item.patient) return 'No person chosen yet';
  return item.patient.relation ? `${item.patient.name} · ${item.patient.relation}` : item.patient.name;
}

export type AddPhase = 'idle' | 'adding' | 'added';

export interface AddState {
  phase: AddPhase;
  /** One key per intended add; a retry of the same tap reuses it so the server adds once. */
  key: string;
}

export type AddAction = { type: 'tap' } | { type: 'added'; nextKey: string } | { type: 'failed' };

export function initialAddState(key: string): AddState {
  return { phase: 'idle', key };
}

/**
 * A failed add keeps the key, because the request may have reached the server; a successful one
 * takes a fresh key, because the next tap is a deliberate second line for another person.
 */
export function addReducer(state: AddState, action: AddAction): AddState {
  switch (action.type) {
    case 'tap':
      return state.phase === 'adding' ? state : { ...state, phase: 'adding' };
    case 'added':
      return { phase: 'added', key: action.nextKey };
    case 'failed':
      return { ...state, phase: 'idle' };
  }
}

export interface AddButtonView {
  label: string;
  busy: boolean;
  inCart: boolean;
  inCartLabel: string;
}

/**
 * What the add control reads, matching the website chat cards. A just-added item counts as in
 * the cart, so the control settles before the fresh cart arrives.
 */
export function addButtonView(inCartCount: number, phase: AddPhase): AddButtonView {
  const busy = phase === 'adding';
  const count = phase === 'added' ? Math.max(inCartCount, 1) : inCartCount;
  return {
    label: busy ? 'Adding' : count > 0 ? 'Add for another person' : 'Add to cart',
    busy,
    inCart: count > 0,
    inCartLabel: inCartLabel(count),
  };
}
