import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useAppActive } from '@/hooks/use-app-active';
import { useAuth } from '@/lib/auth';
import { getPermissionState, registerPushToken, requestPermission, type PermissionState } from '@/lib/notifications';

interface Props {
  title: string;
  body: string;
}

/**
 * A soft ask shown where alerts clearly help (an upcoming call), instead of an OS popup on launch.
 * The system prompt appears only when the person taps "Turn on". If they said no before, the
 * card points to Settings, since the OS will not ask again.
 */
export function NotificationPrompt({ title, body }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<PermissionState | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkTick, setCheckTick] = useState(0);

  // Re-read after a trip to Settings.
  useAppActive(() => setCheckTick((t) => t + 1));

  useEffect(() => {
    let alive = true;
    getPermissionState().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [checkTick]);

  useEffect(() => {
    if (state === 'granted' && user) void registerPushToken(user.id);
  }, [state, user]);

  if (hidden || (state !== 'undetermined' && state !== 'denied')) return null;

  const denied = state === 'denied';

  async function enable() {
    if (denied) {
      void Linking.openSettings();
      return;
    }
    setBusy(true);
    try {
      setState(await requestPermission());
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.icon}>🔔</Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{denied ? `${body} Notifications are off for DocNow in your phone's settings.` : body}</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.primary, busy && styles.busy]}
            onPress={() => void enable()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={denied ? 'Open settings to turn on notifications' : 'Turn on notifications'}>
            <Text style={styles.primaryText}>{denied ? 'Open Settings' : 'Turn on'}</Text>
          </Pressable>
          <Pressable onPress={() => setHidden(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not now">
            <Text style={styles.secondaryText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
  },
  icon: { fontSize: 22 },
  textCol: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  body: { fontSize: 13, color: Colors.foreground, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  primary: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 9 },
  busy: { opacity: 0.6 },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 13 },
  secondaryText: { color: Colors.mutedForeground, fontWeight: '600', fontSize: 13 },
});
