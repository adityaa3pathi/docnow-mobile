import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Specialty } from '@/lib/consult/types';

interface Props {
  specialties: Specialty[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function SpecialtyChips({ specialties, value, onChange }: Props) {
  const chip = (id: string | null, label: string) => {
    const active = value === id;
    return (
      <Pressable
        key={id ?? 'all'}
        onPress={() => onChange(id)}
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${label}`}
        accessibilityState={{ selected: active }}
        style={[styles.chip, active && styles.chipActive]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Filter by specialty">
      {chip(null, 'All')}
      {specialties.map((s) => chip(s.id, s.name))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontWeight: '600', color: Colors.foreground },
  chipTextActive: { color: Colors.primaryForeground },
});
