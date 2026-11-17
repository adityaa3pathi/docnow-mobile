import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import type { InAppToast } from '@/hooks/useNotifications';
import { CHANNEL_IDS } from '@/lib/notifications';

const ICON: Record<string, string> = {
  [CHANNEL_IDS.call]: '📹',
  [CHANNEL_IDS.clinical]: '📄',
  [CHANNEL_IDS.reminders]: '⏰',
};

interface Props {
  toast: InAppToast | null;
  onOpen: () => void;
  onDismiss: () => void;
}

/** Heads-up banner for notifications that arrive while the app is open. Calls get the loud treatment. */
export function NotificationToast({ toast, onOpen, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  if (!toast) return null;

  const isCall = toast.channel === CHANNEL_IDS.call;
  const actionable = toast.target !== null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        style={[styles.card, isCall && styles.callCard]}
        onPress={actionable ? onOpen : onDismiss}
        accessibilityRole={actionable ? 'button' : 'alert'}
        accessibilityLabel={`${toast.title}. ${toast.body}${actionable ? '. Double tap to open' : ''}`}
        accessibilityLiveRegion="assertive">
        <View style={[styles.iconTile, isCall && styles.callIconTile]}>
          <Text style={styles.icon}>{(toast.channel && ICON[toast.channel]) || '🔔'}</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, isCall && styles.callText]} numberOfLines={1}>{toast.title}</Text>
          {toast.body ? (
            <Text style={[styles.body, isCall && styles.callSub]} numberOfLines={2}>{toast.body}</Text>
          ) : null}
        </View>
        {actionable ? (
          <View style={[styles.cta, isCall && styles.callCta]}>
            <Text style={[styles.ctaText, isCall && styles.callCtaText]}>{isCall ? 'Join' : 'View'}</Text>
          </View>
        ) : null}
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss notification" style={styles.close}>
          <Text style={[styles.closeText, isCall && styles.callSub]}>✕</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000, elevation: 1000 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.xl,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  callCard: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  iconTile: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryTint },
  callIconTile: { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  icon: { fontSize: 20 },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  body: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },
  callText: { color: Colors.primaryForeground },
  callSub: { color: 'rgba(255, 255, 255, 0.8)' },
  cta: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md, backgroundColor: Colors.primaryTint },
  callCta: { backgroundColor: Colors.success },
  ctaText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  callCtaText: { color: Colors.primaryForeground },
  close: { padding: 2 },
  closeText: { fontSize: 14, color: Colors.mutedForeground, fontWeight: '600' },
});
