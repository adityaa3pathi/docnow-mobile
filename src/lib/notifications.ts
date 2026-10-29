/**
 * Push notifications: Android channels, permission, Expo push token registration and the
 * foreground presentation rule. Navigation lives in `useNotifications`; links in `deep-links.ts`.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    AndroidAudioUsage,
    AndroidImportance,
    AndroidNotificationVisibility,
    IosAuthorizationStatus,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import { targetFromNotificationData } from '@/lib/deep-links';
import { needsRegistration, readRegistration, saveRegistration } from '@/lib/push-registration';

export { deepLinkPath, deepLinkUrl, parseDeepLink, targetFromNotificationData, type DeepLinkTarget } from '@/lib/deep-links';
export { clearPushRegistration, needsRegistration, unregisterPushToken } from '@/lib/push-registration';

export const CHANNEL_IDS = {
    call: 'teleconsult-call',
    clinical: 'prescriptions-reports',
    reminders: 'reminders',
} as const;

export type ChannelId = (typeof CHANNEL_IDS)[keyof typeof CHANNEL_IDS];

/** Bundled via the expo-notifications config plugin; Android fixes a channel's sound at creation. */
export const CALL_SOUND = 'teleconsult_call.wav';

/**
 * Calls ring loud and show on the lock screen (their text never names a patient). Clinical and
 * reminder alerts stay PRIVATE so a locked phone does not reveal health details.
 */
export const ANDROID_CHANNELS: Record<ChannelId, Notifications.NotificationChannelInput> = {
    [CHANNEL_IDS.call]: {
        name: 'Consultation calls',
        description: 'Heads-up alerts when your patient or doctor is waiting in the video room',
        importance: AndroidImportance.MAX,
        sound: CALL_SOUND,
        enableVibrate: true,
        vibrationPattern: [0, 400, 200, 400, 200, 800],
        lightColor: '#4b2192',
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        audioAttributes: { usage: AndroidAudioUsage.NOTIFICATION_COMMUNICATION_REQUEST },
        showBadge: true,
    },
    [CHANNEL_IDS.clinical]: {
        name: 'Prescriptions & lab reports',
        description: 'When a prescription is issued or a lab report is ready',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#4b2192',
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
        showBadge: true,
    },
    [CHANNEL_IDS.reminders]: {
        name: 'Appointment reminders',
        description: 'A reminder 10 minutes before your consultation',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
        showBadge: true,
    },
};

const supported = () => Platform.OS === 'android' || Platform.OS === 'ios';

/** Android 13+ shows the permission prompt only once a channel exists, so this runs before any request. */
export async function setupNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Promise.all(
        Object.entries(ANDROID_CHANNELS).map(([id, channel]) => Notifications.setNotificationChannelAsync(id, channel)),
    );
}

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'unsupported';

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
    if (p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
    if (!supported() || !Device.isDevice) return 'unsupported';
    try {
        return toState(await Notifications.getPermissionsAsync());
    } catch {
        return 'unsupported';
    }
}

/** Shows the OS prompt. Call only from a user action (see NotificationPrompt), never on app start. */
export async function requestPermission(): Promise<PermissionState> {
    if (!supported() || !Device.isDevice) return 'unsupported';
    try {
        await setupNotificationChannels();
        return toState(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: true } }));
    } catch {
        return 'unsupported';
    }
}

/** The channel a notification was posted to: the payload's `channelId`, else the Android trigger's. */
export function channelOf(notification: Notifications.Notification): ChannelId | null {
    const fromData = (notification.request.content.data as { channelId?: unknown } | undefined)?.channelId;
    const fromTrigger = (notification.request.trigger as { channelId?: unknown } | null)?.channelId;
    const id = typeof fromData === 'string' ? fromData : typeof fromTrigger === 'string' ? fromTrigger : null;
    return (Object.values(CHANNEL_IDS) as string[]).includes(id ?? '') ? (id as ChannelId) : null;
}

/**
 * While the app is open the system banner is replaced by our in-app toast, so it is not shown
 * twice. Calls still ring, because a waiting patient must not be missed.
 */
export function foregroundBehavior(notification: Notifications.Notification): Notifications.NotificationBehavior {
    return {
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: channelOf(notification) === CHANNEL_IDS.call,
        shouldSetBadge: false,
    };
}

export function configureForegroundHandler() {
    if (!supported()) return;
    Notifications.setNotificationHandler({ handleNotification: async (n) => foregroundBehavior(n) });
}

// ── Push payloads from the server dispatcher ────────────

/** `data` of a push sent by the server: `{ url, channelId, kind, consultationId }`. */
export interface PushData {
    url?: string;
    channelId?: string;
    kind?: string;
    consultationId?: string;
}

/**
 * React Query keys a push makes stale, so the screen it is about refreshes at once instead of
 * waiting for its next poll. The link decides whose screen: doctor links refresh the doctor's view.
 */
export function queryKeysForPush(data: unknown): (readonly string[])[] {
    if (!data || typeof data !== 'object') return [];
    const { kind, consultationId } = data as PushData;
    if (typeof consultationId !== 'string' || !consultationId) return [];
    if (targetFromNotificationData(data)?.kind === 'doctor-consultation') {
        return [['doctor', 'consultation', consultationId], ['doctor', 'consultations']];
    }
    const keys: (readonly string[])[] = [['consult', 'bookings']];
    if (kind === 'PRESCRIPTION_ISSUED') keys.push(['consult', 'prescription', consultationId]);
    return keys;
}

// ── Push token registration ─────────────────────────────

function projectId(): string | null {
    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export type RegistrationResult = 'registered' | 'unchanged' | 'unavailable' | 'failed';

let inFlight: { userId: string; promise: Promise<RegistrationResult> } | null = null;

/**
 * Sends this device's Expo push token to the server once per token and account. Never prompts:
 * without permission it returns `unavailable`. Concurrent calls share one request.
 */
export function registerPushToken(userId: string): Promise<RegistrationResult> {
    if (inFlight?.userId === userId) return inFlight.promise;
    const promise = (async (): Promise<RegistrationResult> => {
        if ((await getPermissionState()) !== 'granted') return 'unavailable';
        const id = projectId();
        if (!id) return 'unavailable';
        try {
            const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
            const next = { token, userId };
            if (!needsRegistration(await readRegistration(), next)) return 'unchanged';
            await api.post('/api/profile/push-token', { token, platform: Platform.OS });
            await saveRegistration(next);
            return 'registered';
        } catch {
            return 'failed';
        }
    })().finally(() => {
        inFlight = null;
    });
    inFlight = { userId, promise };
    return promise;
}

