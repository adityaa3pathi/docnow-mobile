// The only checkout file that touches AsyncStorage and expo-crypto, so tested files stay pure.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { checkoutAttemptKey, forgetCheckoutAttempt } from './attempt';

export const keyForCheckout = (cartId: string, slotId: string) =>
    checkoutAttemptKey(cartId, slotId, AsyncStorage, () => Crypto.randomUUID());

export const forgetCheckoutKey = (cartId: string, slotId: string) =>
    forgetCheckoutAttempt(cartId, slotId, AsyncStorage);
