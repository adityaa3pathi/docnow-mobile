import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { ALL_CITIES } from '@/lib/location/cities';

export function Field({
  label,
  value,
  onChange,
  keyboardType,
  maxLength,
  multiline,
  autoCapitalize,
  hint,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, multiline && styles.inputTall]}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholderTextColor={Colors.inkSubtle}
        accessibilityLabel={label}
        accessibilityHint={hint}
      />
    </View>
  );
}

/** A short list of choices as chips; the server accepts only these exact strings. */
export function OptionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (option: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={option}
              accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A city box that suggests from the same list the website offers, but accepts any typed city. */
export function CityField({ label, value, onChange }: { label: string; value: string; onChange: (city: string) => void }) {
  const [touched, setTouched] = useState(false);
  const query = value.trim().toLowerCase();
  const exact = ALL_CITIES.some((city) => city.toLowerCase() === query);
  const suggestions =
    touched && query.length > 0 && !exact
      ? ALL_CITIES.filter((city) => city.toLowerCase().includes(query)).slice(0, 6)
      : [];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          setTouched(true);
          onChange(text);
        }}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        placeholderTextColor={Colors.inkSubtle}
        accessibilityLabel={label}
        accessibilityHint="Type to see matching cities"
      />
      {suggestions.length > 0 && (
        <View style={styles.chips}>
          {suggestions.map((city) => (
            <Pressable
              key={city}
              onPress={() => onChange(city)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Use ${city}`}>
              <Text style={styles.chipText}>{city}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function SubmitButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, busy && styles.busy]}
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Sending' : label}
      accessibilityState={{ busy, disabled: busy }}>
      <Text style={styles.submitText}>{busy ? 'Sending...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space[2] },
  label: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink },
  input: { ...Type.body, minHeight: 44, paddingHorizontal: Space[3], paddingVertical: Space[2], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.ink, backgroundColor: Colors.surface },
  inputTall: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { backgroundColor: Colors.surfaceMuted },
  chipText: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink },
  chipTextOn: { color: Colors.primary, fontFamily: Fonts.semibold },
  submit: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primary, marginTop: Space[2] },
  submitPressed: { backgroundColor: Colors.primaryHover },
  busy: { opacity: 0.7 },
  submitText: { ...Type.body, fontFamily: Fonts.semibold, color: Colors.onPrimary },
});
