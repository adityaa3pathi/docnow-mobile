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
