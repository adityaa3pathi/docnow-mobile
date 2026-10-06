import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

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
  empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, borderStyle: 'dashed' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.foreground, textAlign: 'center' },
  muted: { color: Colors.mutedForeground, textAlign: 'center' },
  error: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.xl, backgroundColor: '#fef2f2' },
  errorText: { color: Colors.destructive, fontWeight: '600', textAlign: 'center' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  retryText: { color: Colors.primary, fontWeight: '700' },
});
