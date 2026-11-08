import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
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
      <Pressable style={styles.addRow} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a person">
        <Text style={styles.add}>Add a person</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space[3] },
  legend: { ...Type.bodyStrong, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  list: { gap: Space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 56, paddingHorizontal: Space[3], paddingVertical: Space[2], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong },
  rowOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  dot: { width: 20, height: 20, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.borderStrong },
  dotOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  rowText: { flex: 1 },
  name: { ...Type.bodyStrong, color: Colors.ink },
  small: { ...Type.small, color: Colors.inkMuted },
  addRow: { minHeight: 44, justifyContent: 'center' },
  add: { ...Type.bodyStrong, color: Colors.primary },
});
