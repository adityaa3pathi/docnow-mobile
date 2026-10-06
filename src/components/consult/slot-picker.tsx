import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { formatIstTime, groupSlotsByDay } from '@/lib/consult/time';
import type { Slot } from '@/lib/consult/types';

interface Props {
  slots: Slot[];
  selectedId: string | null;
  onSelect: (slot: Slot) => void;
}

export function SlotPicker({ slots, selectedId, onSelect }: Props) {
  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  const [chosenDay, setChosenDay] = useState<string | null>(null);

  const selectedDay = days.find((d) => d.slots.some((s) => s.id === selectedId))?.key;
  const active = days.find((d) => d.key === chosenDay) ?? days.find((d) => d.key === selectedDay) ?? days[0];
  if (!active) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days} accessibilityLabel="Choose a day">
        {days.map((d) => {
          const on = d.key === active.key;
          return (
            <Pressable
              key={d.key}
              onPress={() => setChosenDay(d.key)}
              accessibilityRole="tab"
              accessibilityLabel={d.label}
              accessibilityState={{ selected: on }}
              style={[styles.day, on && styles.on]}>
              <Text style={[styles.dayText, on && styles.onText]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.grid} accessibilityLabel={`Times on ${active.label}, Indian time`}>
        {active.slots.map((slot) => {
          const checked = slot.id === selectedId;
          const time = formatIstTime(slot.startsAt);
          return (
            <Pressable
              key={slot.id}
              onPress={() => onSelect(slot)}
              accessibilityRole="radio"
              accessibilityLabel={`${time}, ${active.label}`}
              accessibilityState={{ checked }}
              style={[styles.slot, checked && styles.on]}>
              <Text style={[styles.slotText, checked && styles.onText]}>{time}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>All times are Indian time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  days: { gap: 8 },
  day: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  dayText: { fontWeight: '600', color: Colors.foreground },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { minWidth: 92, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  slotText: { fontWeight: '600', color: Colors.foreground },
  on: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  onText: { color: Colors.primaryForeground },
  note: { fontSize: 12, color: Colors.mutedForeground },
});
