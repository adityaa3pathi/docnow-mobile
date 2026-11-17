/**
 * Which push token this phone last registered, and for whom. Kept free of expo-notifications so
 * sign-out (lib/auth) can unregister without loading the notifications native module.
 */
import * as SecureStore from 'expo-secure-store';

import { api } from '@/lib/api';

const REGISTRATION_KEY = 'docnow_push_registration';
const UNREGISTER_TIMEOUT_MS = 5_000;

export interface Registration {
    token: string;
    userId: string;
}

/** A token is sent again only when it, or the signed-in account, has changed. */
export function needsRegistration(cached: Registration | null, next: Registration): boolean {
    return !cached || cached.token !== next.token || cached.userId !== next.userId;
}

export async function readRegistration(): Promise<Registration | null> {
    try {
        const raw = await SecureStore.getItemAsync(REGISTRATION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<Registration>;
        return typeof parsed.token === 'string' && typeof parsed.userId === 'string' ? { token: parsed.token, userId: parsed.userId } : null;
    } catch {
        return null;
    }
}

export async function saveRegistration(reg: Registration): Promise<void> {
    await SecureStore.setItemAsync(REGISTRATION_KEY, JSON.stringify(reg));
}

/** Forgets the cached registration so the next account on this phone registers afresh. */
export async function clearPushRegistration(): Promise<void> {
    await SecureStore.deleteItemAsync(REGISTRATION_KEY).catch(() => {});
}

/**
 * Tells the server to stop notifying this phone. Must run during sign-out while the session is
 * still valid. Best effort and bounded, so sign-out never hangs offline; the local cache is
 * cleared either way, and the server moves the token when the next account signs in.
 */
export async function unregisterPushToken(): Promise<'removed' | 'none' | 'failed'> {
    const reg = await readRegistration();
    if (!reg) return 'none';
    try {
        await api.delete('/api/profile/push-token', { data: { token: reg.token }, timeout: UNREGISTER_TIMEOUT_MS });
        return 'removed';
    } catch {
        return 'failed';
    } finally {
        await clearPushRegistration();
    }
}
