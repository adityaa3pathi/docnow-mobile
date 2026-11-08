import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Shadow, Space, Type } from '@/constants/theme';
import { friendlyError, people, type Person } from '@/lib/consult/api';
import { GENDERS, RELATIONS, validatePerson } from '@/lib/consult/people';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: (person: Person) => void;
}

export function AddPersonSheet({ visible, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string>('Male');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setRelation('');
    setAge('');
    setGender('Male');
    setError('');
  };
  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  async function save() {
    const input = { name: name.trim(), relation, age: parseInt(age, 10), gender };
    const problem = validatePerson(input);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const person = await people.add(input);
      reset();
      onAdded(person);
      onClose();
    } catch (e) {
      setError(friendlyError(e, 'Could not add this person. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const choice = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Add a person</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter name" accessibilityLabel="Name" />

            <Text style={styles.label}>Relation</Text>
            <View style={styles.wrap}>{RELATIONS.map((r) => choice(r, relation === r, () => setRelation(r)))}</View>

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="Age in years"
              accessibilityLabel="Age"
            />

            <Text style={styles.label}>Sex</Text>
            <View style={styles.wrap}>{GENDERS.map((g) => choice(g, gender === g, () => setGender(g)))}</View>

            {error ? <Notice tone="error">{error}</Notice> : null}

            <View style={styles.actions}>
              <ActionButton label="Add person" busyLabel="Adding..." busy={saving} onPress={save} />
              <Pressable style={styles.secondary} onPress={close} disabled={saving} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Sheets: radius 16 and the one raised shadow; inputs and chips are 44 high with radius 8.
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadow.raised },
  content: { padding: Space[6], gap: Space[2] },
  title: { ...Type.titleSm, color: Colors.ink, marginBottom: Space[1] },
  label: { ...Type.bodyStrong, marginTop: Space[2], color: Colors.ink },
  input: { ...Type.body, minHeight: 44, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.md, paddingHorizontal: Space[3], paddingVertical: Space[2], color: Colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  chip: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Type.bodyStrong, color: Colors.ink },
  chipTextOn: { color: Colors.onPrimary },
  actions: { gap: Space[2], marginTop: Space[4] },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
