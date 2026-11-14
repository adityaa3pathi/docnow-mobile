import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** The NMC telemedicine consent tick, drawn the same way as the one above Join call. */
export function ConsentCheck({ checked, onChange, label }: Props) {
  return (
    <Pressable
      style={[styles.wrap, checked && styles.wrapOn]}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: Space[3],
    alignItems: 'flex-start',
    minHeight: 44,
    padding: Space[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  wrapOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tick: { ...Type.bodyStrong, color: Colors.onPrimary },
  text: { ...Type.small, flex: 1, color: Colors.ink },
});
