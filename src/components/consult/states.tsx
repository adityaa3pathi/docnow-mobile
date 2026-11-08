import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={styles.muted}>{label}...</Text>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.muted}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', backgroundColor: Colors.surface },
  title: { ...Type.bodyStrong, color: Colors.ink, textAlign: 'center' },
  muted: { ...Type.small, color: Colors.inkMuted, textAlign: 'center' },
  error: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.lg, backgroundColor: Colors.dangerSoft },
  errorText: { ...Type.bodyStrong, color: Colors.dangerInk, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  retryText: { ...Type.bodyStrong, color: Colors.ink },
});
