import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  busy?: boolean;
}

export function Pager({ page, totalPages, onChange, busy = false }: Props) {
  if (totalPages <= 1) return null;
  const back = page > 1 && !busy;
  const forward = page < totalPages && !busy;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(page - 1)}
        disabled={!back}
        style={[styles.button, !back && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        accessibilityState={{ disabled: !back }}>
        <Text style={styles.buttonText}>Previous</Text>
      </Pressable>
      <Text style={styles.count} accessibilityLabel={`Page ${page} of ${totalPages}`}>
        Page {page} of {totalPages}
      </Text>
      <Pressable
        onPress={() => onChange(page + 1)}
        disabled={!forward}
        style={[styles.button, !forward && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Next page"
        accessibilityState={{ disabled: !forward }}>
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingHorizontal: Space[4], paddingVertical: Space[4] },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  disabled: { opacity: 0.4 },
  buttonText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
  count: { ...Type.small, color: Colors.inkMuted },
});
