import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

/** A labelled text box. The label is the accessibility label too, so every field is announced. */
export function Field({ label, hint, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.inkSubtle}
        accessibilityLabel={label}
        accessibilityHint={hint}
        {...input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A password box with its own show and hide button, like the eye on the website. */
export function PasswordField({ label, hint, ...input }: FieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.grow]}
          placeholderTextColor={Colors.inkSubtle}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...input}
        />
        <Pressable
          onPress={() => setShown((on) => !on)}
          accessibilityRole="button"
          accessibilityLabel={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          style={styles.reveal}>
          <Text style={styles.revealText}>{shown ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

interface ChipsProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

/** One choice out of a few, as 44-high chips rather than a dropdown. */
export function ChipGroup({ label, options, value, onChange }: ChipsProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: active }}
              style={[styles.chip, active && styles.chipOn]}>
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A value the server will not let anyone change here, shown as read-only with the reason. */
export function LockedField({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, styles.locked]} accessibilityLabel={`${label}, ${value}, cannot be changed`}>
        <Text style={styles.lockedText}>{value}</Text>
      </View>
      <Text style={styles.hint}>{note}</Text>
    </View>
  );
}

interface RowProps {
  title: string;
  note?: string;
  value?: string;
  onPress: () => void;
  tone?: 'normal' | 'danger';
}

/** One tappable line in the profile list. */
export function ListRow({ title, note, value, onPress, tone = 'normal' }: RowProps) {
  const label = [title, value, note].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}>
      <View style={styles.grow}>
        <Text style={[styles.rowTitle, tone === 'danger' && styles.danger]}>{title}</Text>
        {note ? <Text style={styles.rowNote}>{note}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space[1] },
  label: { ...Type.bodyStrong, color: Colors.ink },
  input: {
    ...Type.body,
    minHeight: 44,
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    color: Colors.ink,
  },
  hint: { ...Type.small, color: Colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  grow: { flex: 1 },
  reveal: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  revealText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  chip: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Space[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Type.bodyStrong, color: Colors.ink },
  chipTextOn: { color: Colors.onPrimary },
  locked: { justifyContent: 'center', backgroundColor: Colors.surfaceMuted, borderColor: Colors.border },
  lockedText: { ...Type.body, color: Colors.inkMuted },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    minHeight: 56,
    paddingHorizontal: Space[4],
    paddingVertical: Space[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pressed: { backgroundColor: Colors.surfaceMuted },
  rowTitle: { ...Type.bodyStrong, color: Colors.ink },
  rowNote: { ...Type.small, color: Colors.inkMuted },
  rowValue: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  danger: { color: Colors.dangerInk },
  chevron: { ...Type.bodyLg, color: Colors.inkSubtle },
  section: { ...Type.bodyStrong, color: Colors.inkMuted, marginTop: Space[4] },
});
