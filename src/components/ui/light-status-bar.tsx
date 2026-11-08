import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/** White status-bar icons while a purple-band screen is in front; the root's dark style returns on leave. */
export function LightStatusBar() {
  return useIsFocused() ? <StatusBar style="light" /> : null;
}
