// NativeModuleType, not NativeModule: in SDK 57 the latter is the constructor type and
// so has no addListener.
import { requireOptionalNativeModule, type NativeModuleType } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

// A type alias, not an interface: expo's EventsMap needs an implicit index signature.
type CallServiceEvents = {
  /** The user swiped the app out of Recents; the process is about to be killed. */
  onTaskRemoved: () => void;
};

type CallServiceModule = NativeModuleType<CallServiceEvents> & {
  start(): boolean;
  stop(): void;
};

/** Android only. iOS keeps call audio through the `audio` background mode in app.json. */
const native = requireOptionalNativeModule<CallServiceModule>('CallService');

/**
 * Shows "Consultation in progress" so Android keeps the mic and camera when the app is
 * in the background. Resolves false when the service did not start, null off Android.
 */
export async function startCallService(): Promise<boolean | null> {
  if (!native) return null;
  await requestNotificationPermission();
  return native.start();
}

export function stopCallService() {
  native?.stop();
}

/** Returns null off Android, so the caller does not have to unsubscribe. */
export function addTaskRemovedListener(listener: () => void) {
  return native?.addListener('onTaskRemoved', listener) ?? null;
}

// The call must still work when denied; only the notification is lost.
async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  try {
    await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
  } catch {
    // A denied or unavailable prompt is not worth failing the call over.
  }
}
