import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';
import {
    CHANNEL_IDS,
    channelOf,
    clearPushRegistration,
    configureForegroundHandler,
    deepLinkPath,
    registerPushToken,
    setupNotificationChannels,
    targetFromNotificationData,
    type ChannelId,
    type DeepLinkTarget,
} from '@/lib/notifications';

export interface InAppToast {
    id: string;
    title: string;
    body: string;
    channel: ChannelId | null;
    target: DeepLinkTarget | null;
}

const TOAST_MS = { call: 12_000, other: 6_000 } as const;
const native = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * Mounted once in the root layout. Creates channels, registers the push token when permission was
 * already given (it never prompts), shows foreground notifications as an in-app toast, and opens
 * the linked screen when a notification is tapped, including the tap that cold-started the app.
 * Navigation waits until the router is mounted and someone is signed in.
 */
export function useNotifications(userId: string | null) {
    const navReady = Boolean(useRootNavigationState()?.key);
    const pending = useRef<DeepLinkTarget | null>(null);
    const handledResponse = useRef<string | null>(null);
    const [pendingTick, setPendingTick] = useState(0);
    const [toast, setToast] = useState<InAppToast | null>(null);

    const queue = useCallback((target: DeepLinkTarget | null) => {
        if (!target) return;
        pending.current = target;
        setPendingTick((t) => t + 1);
    }, []);

    // Channels and the foreground rule do not need permission, so they are set up straight away.
    useEffect(() => {
        if (!native) return;
        configureForegroundHandler();
        setupNotificationChannels().catch(() => {});
    }, []);

    useEffect(() => {
        if (!native) return;
        if (userId) void registerPushToken(userId);
        else void clearPushRegistration();
    }, [userId]);

    useEffect(() => {
        if (!native) return;
        const targetOf = (response: Notifications.NotificationResponse) => {
            const id = response.notification.request.identifier;
            if (handledResponse.current === id) return null;
            handledResponse.current = id;
            return targetFromNotificationData(response.notification.request.content.data);
        };

        // A tap that launched the app arrives before any listener exists. The navigation effect
        // below runs after this one in the same commit, so it picks the target up.
        const launch = Notifications.getLastNotificationResponse();
        if (launch) {
            pending.current = targetOf(launch) ?? pending.current;
            Notifications.clearLastNotificationResponse();
        }

        const responseSub = Notifications.addNotificationResponseReceivedListener((r) => queue(targetOf(r)));
        const receivedSub = Notifications.addNotificationReceivedListener((n) => {
            const channel = channelOf(n);
            if (channel === CHANNEL_IDS.call) hapticNotify(NotificationFeedbackType.Warning);
            setToast({
                id: n.request.identifier,
                title: n.request.content.title ?? 'DocNow',
                body: n.request.content.body ?? '',
                channel,
                target: targetFromNotificationData(n.request.content.data),
            });
        });
        return () => {
            responseSub.remove();
            receivedSub.remove();
        };
    }, [queue]);

    // Opens the queued screen once the router can navigate and the protected routes exist.
    useEffect(() => {
        const target = pending.current;
        if (!target || !navReady || !userId) return;
        pending.current = null;
        router.push(deepLinkPath(target) as Href);
    }, [navReady, userId, pendingTick]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), toast.channel === CHANNEL_IDS.call ? TOAST_MS.call : TOAST_MS.other);
        return () => clearTimeout(timer);
    }, [toast]);

    const dismissToast = useCallback(() => setToast(null), []);
    const openToast = useCallback(() => {
        queue(toast?.target ?? null);
        setToast(null);
    }, [queue, toast]);

    return { toast, dismissToast, openToast };
}
