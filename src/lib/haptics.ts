import * as Haptics from 'expo-haptics';

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

// Fire-and-forget haptics. expo-haptics can throw synchronously or reject on
// web / unsupported devices, so both paths are swallowed and callers never block.
export function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch {
    // Unsupported environment
  }
}

export function hapticNotify(type: Haptics.NotificationFeedbackType) {
  try {
    Haptics.notificationAsync(type).catch(() => {});
  } catch {
    // Unsupported environment
  }
}
