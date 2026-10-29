import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirectSystemPath } from '@/app/+native-intent';
import { api } from '@/lib/api';
import {
    ANDROID_CHANNELS,
    CALL_SOUND,
    CHANNEL_IDS,
    deepLinkPath,
    deepLinkUrl,
    foregroundBehavior,
    needsRegistration,
    parseDeepLink,
    queryKeysForPush,
    registerPushToken,
    requestPermission,
    setupNotificationChannels,
    targetFromNotificationData,
    unregisterPushToken,
} from './notifications';

const platform = vi.hoisted(() => ({ OS: 'android' as 'android' | 'ios' | 'web' }));
const store = vi.hoisted(() => new Map<string, string>());

vi.mock('react-native', () => ({ Platform: platform }));

vi.mock('expo-device', () => ({ isDevice: true }));

vi.mock('expo-constants', () => ({
    default: { expoConfig: { extra: { eas: { projectId: 'project-123' } } }, easConfig: null },
}));

vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), delete: vi.fn() } }));

vi.mock('expo-notifications', () => ({
    AndroidImportance: { DEFAULT: 5, HIGH: 6, MAX: 7 },
    AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 2 },
    AndroidAudioUsage: { NOTIFICATION_COMMUNICATION_REQUEST: 7 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: vi.fn(),
    getPermissionsAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
    getExpoPushTokenAsync: vi.fn(),
    setNotificationHandler: vi.fn(),
}));

const UUID = '3f2b8c1e-9a4d-4b7e-8f61-2c5d9e0a7b13';
const granted = { granted: true, canAskAgain: true, status: 'granted' } as unknown as Notifications.NotificationPermissionsStatus;
const notGranted = (canAskAgain: boolean) =>
    ({ granted: false, canAskAgain, status: canAskAgain ? 'undetermined' : 'denied' }) as unknown as Notifications.NotificationPermissionsStatus;

const notification = (data: Record<string, unknown>, channelId?: string) =>
    ({
        request: { identifier: 'n1', content: { title: 't', body: 'b', data }, trigger: channelId ? { type: 'push', channelId } : null },
        date: 0,
    }) as unknown as Notifications.Notification;

beforeEach(() => {
    platform.OS = 'android';
    store.clear();
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (k: string) => store.get(k) ?? null);
    vi.mocked(SecureStore.setItemAsync).mockImplementation(async (k: string, v: string) => void store.set(k, v));
    vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k: string) => void store.delete(k));
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(granted);
    vi.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[aaa]' });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
});

describe('Android notification channels', () => {
    it('defines exactly the three DocNow channels', () => {
        expect(Object.keys(ANDROID_CHANNELS).sort()).toEqual(['prescriptions-reports', 'reminders', 'teleconsult-call']);
    });

    it('teleconsult-call is a MAX-importance heads-up channel with the custom ring and vibration', () => {
        const call = ANDROID_CHANNELS[CHANNEL_IDS.call];
        expect(call.importance).toBe(AndroidImportance.MAX);
        expect(call.sound).toBe(CALL_SOUND);
        expect(call.enableVibrate).toBe(true);
        expect(call.vibrationPattern?.length).toBeGreaterThan(2);
        expect(call.lockscreenVisibility).toBe(AndroidNotificationVisibility.PUBLIC);
    });

    it('prescriptions-reports is HIGH and reminders is DEFAULT, both hidden on the lock screen', () => {
        expect(ANDROID_CHANNELS[CHANNEL_IDS.clinical].importance).toBe(AndroidImportance.HIGH);
        expect(ANDROID_CHANNELS[CHANNEL_IDS.reminders].importance).toBe(AndroidImportance.DEFAULT);
        expect(ANDROID_CHANNELS[CHANNEL_IDS.clinical].lockscreenVisibility).toBe(AndroidNotificationVisibility.PRIVATE);
        expect(ANDROID_CHANNELS[CHANNEL_IDS.reminders].lockscreenVisibility).toBe(AndroidNotificationVisibility.PRIVATE);
    });

    it('registers every channel on Android and none on iOS', async () => {
        await setupNotificationChannels();
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(3);
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('teleconsult-call', ANDROID_CHANNELS['teleconsult-call']);

        vi.mocked(Notifications.setNotificationChannelAsync).mockClear();
        platform.OS = 'ios';
        await setupNotificationChannels();
        expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });

    it('creates channels before asking (Android 13+ only prompts once a channel exists)', async () => {
        const order: string[] = [];
        vi.mocked(Notifications.setNotificationChannelAsync).mockImplementation(async () => (order.push('channel'), null));
        vi.mocked(Notifications.requestPermissionsAsync).mockImplementation(async () => (order.push('request'), granted));
        expect(await requestPermission()).toBe('granted');
        expect(order.indexOf('request')).toBeGreaterThan(order.lastIndexOf('channel'));
    });

    it('in the foreground, the toast replaces the banner and only calls ring', () => {
        expect(foregroundBehavior(notification({}, 'teleconsult-call'))).toMatchObject({ shouldShowBanner: false, shouldPlaySound: true });
        expect(foregroundBehavior(notification({ channelId: 'reminders' }))).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
    });
});

describe('deep-link parser', () => {
    it.each([
        [`docnow://consult/room/${UUID}`, { kind: 'consult-room', id: UUID }],
        [`docnow://doctor/consultations/${UUID}`, { kind: 'doctor-consultation', id: UUID }],
        [`docnow://records/prescription/${UUID}`, { kind: 'prescription', id: UUID }],
    ])('parses %s', (url, target) => {
        expect(parseDeepLink(url)).toEqual(target);
    });

    it('accepts the shapes the OS and Expo hand over', () => {
        const room = { kind: 'consult-room', id: UUID };
        expect(parseDeepLink(`docnow:///consult/room/${UUID}`)).toEqual(room);
        expect(parseDeepLink(`/consult/room/${UUID}`)).toEqual(room);
        expect(parseDeepLink(`consult/room/${UUID}/`)).toEqual(room);
        expect(parseDeepLink(`docnow://consult/room/${UUID}?utm=sms#top`)).toEqual(room);
        expect(parseDeepLink(`exp://192.168.1.5:8081/--/consult/room/${UUID}`)).toEqual(room);
    });

    it('refuses anything outside the contract', () => {
        expect(parseDeepLink(`https://evil.example/consult/room/${UUID}`)).toBeNull();
        expect(parseDeepLink('docnow://consult/room/../../admin')).toBeNull();
        expect(parseDeepLink('docnow://consult/room/abc%2F..')).toBeNull();
        expect(parseDeepLink(`docnow://consult/room/${UUID}/extra`)).toBeNull();
        expect(parseDeepLink('docnow://consult/room/')).toBeNull();
        expect(parseDeepLink('docnow://tests/explore')).toBeNull();
        expect(parseDeepLink('')).toBeNull();
        expect(parseDeepLink(undefined)).toBeNull();
    });

    it('maps each link to its in-app route, and builds the public link back', () => {
        expect(deepLinkPath({ kind: 'consult-room', id: UUID })).toBe(`/consult/booking/${UUID}?join=1`);
        expect(deepLinkPath({ kind: 'doctor-consultation', id: UUID })).toBe(`/doctor/consultations/${UUID}`);
        expect(deepLinkPath({ kind: 'prescription', id: UUID })).toBe(`/consult/prescription/${UUID}`);
        for (const kind of ['consult-room', 'doctor-consultation', 'prescription'] as const) {
            expect(parseDeepLink(deepLinkUrl({ kind, id: UUID }))).toEqual({ kind, id: UUID });
        }
    });

    it('rewrites incoming system links and leaves others for the router', () => {
        expect(redirectSystemPath({ path: `docnow://doctor/consultations/${UUID}`, initial: true })).toBe(`/doctor/consultations/${UUID}`);
        expect(redirectSystemPath({ path: 'docnow://tests/explore', initial: false })).toBe('docnow://tests/explore');
    });

    it('reads the link from a push payload', () => {
        expect(targetFromNotificationData({ url: `docnow://records/prescription/${UUID}` })).toEqual({ kind: 'prescription', id: UUID });
        expect(targetFromNotificationData({ url: 42 })).toBeNull();
        expect(targetFromNotificationData(null)).toBeNull();
    });
});

describe('push token registration', () => {
    it('only re-sends when the token or account changes', () => {
        expect(needsRegistration(null, { token: 'a', userId: 'u' })).toBe(true);
        expect(needsRegistration({ token: 'a', userId: 'u' }, { token: 'a', userId: 'u' })).toBe(false);
        expect(needsRegistration({ token: 'a', userId: 'u' }, { token: 'b', userId: 'u' })).toBe(true);
        expect(needsRegistration({ token: 'a', userId: 'u' }, { token: 'a', userId: 'v' })).toBe(true);
    });

    it('registers once, then skips the network while nothing changed', async () => {
        expect(await registerPushToken('user-1')).toBe('registered');
        expect(api.post).toHaveBeenCalledWith('/api/profile/push-token', { token: 'ExponentPushToken[aaa]', platform: 'android' });
        expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-123' });

        expect(await registerPushToken('user-1')).toBe('unchanged');
        expect(api.post).toHaveBeenCalledTimes(1);

        expect(await registerPushToken('user-2')).toBe('registered');
        expect(api.post).toHaveBeenCalledTimes(2);
    });

    it('shares one request between concurrent callers', async () => {
        const [a, b] = await Promise.all([registerPushToken('user-1'), registerPushToken('user-1')]);
        expect([a, b]).toEqual(['registered', 'registered']);
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('never prompts and never sends without permission', async () => {
        vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(notGranted(true));
        expect(await registerPushToken('user-1')).toBe('unavailable');
        expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('does not cache a failed registration, so the next launch retries', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(new Error('404'));
        expect(await registerPushToken('user-1')).toBe('failed');
        expect(store.size).toBe(0);
        expect(await registerPushToken('user-1')).toBe('registered');
    });
});

describe('server push payloads', () => {
    it('refreshes the doctor workspace and list for doctor links', () => {
        expect(queryKeysForPush({ url: `docnow://doctor/consultations/${UUID}`, kind: 'PARTNER_WAITING', consultationId: UUID })).toEqual([
            ['doctor', 'consultation', UUID],
            ['doctor', 'consultations'],
        ]);
    });

    it('refreshes the patient bookings, and the prescription once it is issued', () => {
        expect(queryKeysForPush({ url: `docnow://consult/room/${UUID}`, kind: 'JOIN_NOW', consultationId: UUID })).toEqual([['consult', 'bookings']]);
        expect(queryKeysForPush({ url: `docnow://records/prescription/${UUID}`, kind: 'PRESCRIPTION_ISSUED', consultationId: UUID })).toEqual([
            ['consult', 'bookings'],
            ['consult', 'prescription', UUID],
        ]);
    });

    it('ignores payloads that are not from the dispatcher', () => {
        expect(queryKeysForPush({ url: 'docnow://consult/room/x' })).toEqual([]);
        expect(queryKeysForPush('hello')).toEqual([]);
        expect(queryKeysForPush(null)).toEqual([]);
    });
});

describe('unregistering on sign-out', () => {
    it('asks the server to forget this phone, then clears the local record', async () => {
        await registerPushToken('user-1');
        vi.mocked(api.delete).mockResolvedValue({ data: {} });
        expect(await unregisterPushToken()).toBe('removed');
        expect(api.delete).toHaveBeenCalledWith('/api/profile/push-token', expect.objectContaining({ data: { token: 'ExponentPushToken[aaa]' } }));
        expect(store.size).toBe(0);
    });

    it('still clears locally when offline, so sign-out never hangs or fails', async () => {
        await registerPushToken('user-1');
        vi.mocked(api.delete).mockRejectedValue(new Error('Network Error'));
        expect(await unregisterPushToken()).toBe('failed');
        expect(store.size).toBe(0);
    });

    it('makes no call when this phone never registered', async () => {
        expect(await unregisterPushToken()).toBe('none');
        expect(api.delete).not.toHaveBeenCalled();
    });
});
