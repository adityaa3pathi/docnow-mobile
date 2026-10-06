import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  variant?: 'primary' | 'soft' | 'danger';
}

export function ActionButton({ label, onPress, busy, busyLabel, disabled, variant = 'primary' }: ButtonProps) {
  const off = disabled || busy;
  const text = busy && busyLabel ? busyLabel : label;
  return (
    <Pressable
      style={[styles.button, styles[variant], off && styles.off]}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: !!off, busy: !!busy }}>
      {busy ? <ActivityIndicator color={variant === 'primary' ? Colors.primaryForeground : Colors.primary} /> : null}
      <Text style={[styles.buttonText, variant === 'primary' ? styles.onPrimary : variant === 'danger' ? styles.onDanger : styles.onSoft]}>{text}</Text>
    </Pressable>
  );
}

/** A message that screen readers read out when it appears. */
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  return (
    <View style={[styles.notice, styles[`notice_${tone}`]]} accessibilityLiveRegion="polite" accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Text style={[styles.noticeText, tone === 'error' && styles.noticeError]}>{children}</Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: Radius.xl },
  primary: { backgroundColor: Colors.primary },
  soft: { backgroundColor: Colors.primaryTint },
  danger: { backgroundColor: '#fef2f2' },
  off: { opacity: 0.55 },
  buttonText: { fontWeight: '700', fontSize: 15, textAlign: 'center' },
  onPrimary: { color: Colors.primaryForeground },
  onSoft: { color: Colors.primary },
  onDanger: { color: Colors.destructive },
  notice: { padding: 12, borderRadius: Radius.lg },
  notice_info: { backgroundColor: Colors.primaryTint },
  notice_success: { backgroundColor: '#dcfce7' },
  notice_warning: { backgroundColor: '#fef3c7' },
  notice_error: { backgroundColor: '#fef2f2' },
  noticeText: { color: Colors.foreground, fontWeight: '600' },
  noticeError: { color: Colors.destructive },
  card: { gap: 8, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
});
