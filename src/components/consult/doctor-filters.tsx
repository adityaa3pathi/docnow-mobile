import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Shadow, Space, Type } from '@/constants/theme';
import {
  activeFilterCount, EXPERIENCE_STEPS, FEE_STEPS, NO_FILTERS, SORT_LABELS,
  type DoctorFilterState, type DoctorSort,
} from '@/lib/consult/doctorFilters';
import { formatRupees } from '@/lib/consult/format';

interface Option<T> { value: T; label: string }

/** A chip that opens a sheet of choices; filled purple once something is chosen. */
function FilterChip<T>({ label, title, active, options, selected, onPick, multi = false }: {
  label: string;
  title: string;
  active: boolean;
  options: Option<T>[];
  selected: (v: T) => boolean;
  onPick: (v: T) => void;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.chip, active && styles.chipOn]}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${label}`}
        accessibilityHint="Opens a list of choices"
        accessibilityState={{ selected: active, expanded: open }}>
        <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
          {/* The sheet swallows taps so only the backdrop closes it. */}
          <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
            <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text>
            <ScrollView>
              <View accessibilityRole={multi ? undefined : 'radiogroup'} accessibilityLabel={title}>
                {options.map((o) => {
                  const on = selected(o.value);
                  return (
                    <Pressable
                      key={String(o.value)}
                      // Multi-choice sheets stay open so several languages can be ticked in one go.
                      onPress={() => { onPick(o.value); if (!multi) setOpen(false); }}
                      style={styles.option}
                      accessibilityRole={multi ? 'checkbox' : 'radio'}
                      accessibilityLabel={o.label}
                      accessibilityState={{ checked: on }}>
                      <Text style={[styles.optionText, on && styles.optionTextOn]}>{o.label}</Text>
                      {on ? <Text style={styles.tick}>Chosen</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable style={styles.done} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function DoctorFilters({ value, onChange, languages, shown, total }: {
  value: DoctorFilterState;
  onChange: (next: DoctorFilterState) => void;
  languages: string[];
  shown: number;
  total: number;
}) {
  const set = (patch: Partial<DoctorFilterState>) => onChange({ ...value, ...patch });
  const count = activeFilterCount(value);
  const toggle = <T,>(current: T | null, v: T) => (current === v ? null : v);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Filter and sort doctors">
        <FilterChip<DoctorSort>
          title="Sort"
          label={value.sort === 'recommended' ? 'Sort' : SORT_LABELS[value.sort]}
          active={value.sort !== 'recommended'}
          options={(Object.keys(SORT_LABELS) as DoctorSort[]).map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          selected={(s) => value.sort === s}
          onPick={(s) => set({ sort: s })}
        />
        {languages.length > 0 ? (
          <FilterChip<string>
            multi
            title="Language"
            label={value.languages.length ? `Language · ${value.languages.length}` : 'Language'}
            active={value.languages.length > 0}
            options={languages.map((l) => ({ value: l, label: l }))}
            selected={(l) => value.languages.includes(l)}
            onPick={(l) => set({ languages: value.languages.includes(l) ? value.languages.filter((x) => x !== l) : [...value.languages, l] })}
          />
        ) : null}
        <FilterChip<'Female' | 'Male'>
          title="Gender"
          label={value.gender ? `${value.gender} doctor` : 'Gender'}
          active={!!value.gender}
          options={[{ value: 'Female', label: 'Female doctor' }, { value: 'Male', label: 'Male doctor' }]}
          selected={(g) => value.gender === g}
          onPick={(g) => set({ gender: toggle(value.gender, g) })}
        />
        <FilterChip<number>
          title="Experience"
          label={value.minExperience !== null ? `${value.minExperience}+ years` : 'Experience'}
          active={value.minExperience !== null}
          options={EXPERIENCE_STEPS.map((y) => ({ value: y, label: `${y}+ years` }))}
          selected={(y) => value.minExperience === y}
          onPick={(y) => set({ minExperience: toggle(value.minExperience, y) })}
        />
        <FilterChip<number>
          title="Fee"
          label={value.maxFee !== null ? `Up to ${formatRupees(value.maxFee)}` : 'Fee'}
          active={value.maxFee !== null}
          options={FEE_STEPS.map((f) => ({ value: f, label: `Up to ${formatRupees(f)}` }))}
          selected={(f) => value.maxFee === f}
          onPick={(f) => set({ maxFee: toggle(value.maxFee, f) })}
        />
        {count > 0 || value.sort !== 'recommended' ? (
          <Pressable style={styles.clear} onPress={() => onChange(NO_FILTERS)} accessibilityRole="button" accessibilityLabel="Clear all filters">
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Text style={styles.count} accessibilityLiveRegion="polite">
        {count > 0 ? `Showing ${shown} of ${total} doctors` : `${total} ${total === 1 ? 'doctor' : 'doctors'}`}
      </Text>
    </View>
  );
}

// Chips are 44 high pills; the chosen one takes the purple fill, like the website's filter row.
const styles = StyleSheet.create({
  wrap: { gap: Space[2] },
  row: { gap: Space[2], paddingHorizontal: Space[4] },
  chip: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Type.bodyStrong, color: Colors.ink },
  chipTextOn: { color: Colors.onPrimary },
  clear: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[3] },
  clearText: { ...Type.bodyStrong, color: Colors.primary },
  count: { ...Type.small, color: Colors.inkMuted, paddingHorizontal: Space[4] },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
  sheet: { maxHeight: '80%', paddingHorizontal: Space[6], paddingTop: Space[6], paddingBottom: Space[4], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadow.raised },
  sheetTitle: { ...Type.titleSm, color: Colors.ink, marginBottom: Space[2] },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], minHeight: 48, paddingVertical: Space[2] },
  optionText: { ...Type.body, color: Colors.ink },
  optionTextOn: { fontFamily: Fonts.semibold, color: Colors.primary },
  tick: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  done: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: Space[2], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong },
  doneText: { ...Type.bodyStrong, color: Colors.ink },
});
