import { requireOptionalNativeModule } from 'expo';

/** Android only. iOS keeps call audio through the `audio` background mode in app.json. */
const native = requireOptionalNativeModule<{ start(): void; stop(): void }>('CallService');

/** Shows "Consultation in progress" so Android keeps the mic and camera when the app is in the background. */
export function startCallService() {
  native?.start();
}

export function stopCallService() {
  native?.stop();
}
