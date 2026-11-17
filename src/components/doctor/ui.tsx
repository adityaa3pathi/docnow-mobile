import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';

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
      {busy ? <ActivityIndicator color={variant === 'soft' ? Colors.ink : Colors.onPrimary} /> : null}
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

// DESIGN.md: controls are 44 high with radius 8, cards radius 12 with a border and no shadow.
const styles = StyleSheet.create({
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md },
  primary: { backgroundColor: Colors.primary },
  soft: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
  danger: { backgroundColor: Colors.danger },
  off: { opacity: 0.5 },
  buttonText: { ...Type.bodyStrong, textAlign: 'center' },
  onPrimary: { color: Colors.onPrimary },
  onSoft: { color: Colors.ink },
  onDanger: { color: Colors.onPrimary },
  notice: { padding: 12, borderRadius: Radius.md },
  notice_info: { backgroundColor: Colors.infoSoft },
  notice_success: { backgroundColor: Colors.successSoft },
  notice_warning: { backgroundColor: Colors.warningSoft },
  notice_error: { backgroundColor: Colors.dangerSoft },
  noticeText: { ...Type.small, color: Colors.ink },
  noticeError: { color: Colors.dangerInk },
  card: { gap: 8, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
});
