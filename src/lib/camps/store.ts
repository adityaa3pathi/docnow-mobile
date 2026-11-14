// The only camp file that touches AsyncStorage and expo-crypto, so tested files stay pure.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { campAttemptKey, forgetCampAttempt } from './attempt';

export const keyForCamp = (campId: string, patientId: string) =>
    campAttemptKey(campId, patientId, AsyncStorage, () => Crypto.randomUUID());

export const forgetCampKey = (campId: string, patientId: string) =>
    forgetCampAttempt(campId, patientId, AsyncStorage);
