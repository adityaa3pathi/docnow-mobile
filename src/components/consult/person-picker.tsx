import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Person } from '@/lib/consult/api';

interface Props {
  people: Person[];
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
}

export function PersonPicker({ people, value, onChange, onAdd }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.legend} accessibilityRole="header">Who is this visit for?</Text>
      {people.length === 0 ? (
        <Text style={styles.muted}>You have no saved people yet. Add yourself or a family member to continue.</Text>
      ) : null}
      <View accessibilityRole="radiogroup" style={styles.list}>
        {people.map((p) => {
          const checked = p.id === value;
          const relation = p.relation?.toLowerCase() === 'self' ? 'Me' : p.relation;
          return (
            <Pressable
              key={p.id}
              onPress={() => onChange(p.id)}
              accessibilityRole="radio"
              accessibilityLabel={`${p.name}, ${relation}, ${p.age} years`}
              accessibilityState={{ checked }}
              style={[styles.row, checked && styles.rowOn]}>
              <View style={[styles.dot, checked && styles.dotOn]} />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.small}>{relation} · {p.age} years</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a person">
        <Text style={styles.add}>+ Add a person</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  legend: { fontWeight: '700', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.muted },
  rowOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.mutedForeground },
  dotOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  rowText: { flex: 1 },
  name: { fontWeight: '600', color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  add: { color: Colors.primary, fontWeight: '700' },
});
