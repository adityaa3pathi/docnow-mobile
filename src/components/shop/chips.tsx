import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';

export interface ChipOption {
  value: string;
  label: string;
}

interface Props {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Spoken as "Filter by <this>", and used as the row's own label. */
  groupLabel: string;
  /** When set, tapping the selected chip clears it. */
  clearable?: boolean;
}

/** A scrolling row of filter pills, styled like the website's category and type filters. */
export function Chips({ options, value, onChange, groupLabel, clearable = false }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={groupLabel}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(active && clearable ? null : option.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${option.label}`}
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Space[2], paddingHorizontal: Space[4] },
  // Same as the website: pill chips, the selected one in the soft purple.
  chip: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipText: { ...Type.bodyStrong, color: Colors.ink },
  chipTextActive: { color: Colors.primary },
});
