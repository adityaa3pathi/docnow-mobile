import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
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
  row: { gap: Space[2], paddingHorizontal: Space[4] },
  // Same as the website: pill chips, the selected one in the soft purple (purple fill is for buttons).
  chip: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipText: { ...Type.bodyStrong, color: Colors.ink },
  chipTextActive: { color: Colors.primary },
});
