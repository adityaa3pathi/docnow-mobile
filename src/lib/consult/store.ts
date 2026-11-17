// The only place that touches AsyncStorage and expo-crypto, so tested files stay free of native code.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { attemptKey, forgetAttemptKey } from './idempotency';
import { clearSavedBooking, loadSavedBooking, saveBooking, type SavedBooking } from './bookingFlow';

export const keyFor = (slotId: string, patientId: string) => attemptKey(slotId, patientId, AsyncStorage, () => Crypto.randomUUID());
export const forgetKey = (slotId: string, patientId: string) => forgetAttemptKey(slotId, patientId, AsyncStorage);
export const saveActiveBooking = (saved: SavedBooking) => saveBooking(saved, AsyncStorage);
export const loadActiveBooking = () => loadSavedBooking(AsyncStorage);
export const clearActiveBooking = () => clearSavedBooking(AsyncStorage);

// When a checkout was last opened per booking, in server time; kept across app restarts.
const checkoutKeyFor = (bookingId: string) => `consult-checkout-opened:${bookingId}`;
export async function markCheckoutOpened(bookingId: string, atMs: number) {
  try {
    await AsyncStorage.setItem(checkoutKeyFor(bookingId), String(atMs));
  } catch {
    // Without it only this session's memory guards against paying twice.
  }
}
export async function loadCheckoutOpened(bookingId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(checkoutKeyFor(bookingId));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
