import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
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

// Controls are 44 high with radius 8; the purple fill marks the chosen day and time.
const styles = StyleSheet.create({
  wrap: { gap: Space[3] },
  days: { gap: Space[2] },
  day: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  dayText: { ...Type.bodyStrong, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  slot: { minWidth: 92, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  slotText: { ...Type.bodyStrong, color: Colors.ink, fontVariant: ['tabular-nums'] },
  on: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  onText: { color: Colors.onPrimary },
  note: { ...Type.small, color: Colors.inkMuted },
});
