import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
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

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Pressable style={[styles.primary, saving && styles.disabled]} disabled={saving} onPress={save} accessibilityRole="button" accessibilityLabel="Add person">
              {saving ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Add person</Text>}
            </Pressable>
            <Pressable style={styles.secondary} onPress={close} disabled={saving} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.background },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground, marginBottom: 4 },
  label: { marginTop: 8, fontWeight: '600', color: Colors.foreground },
  input: { borderWidth: 1, borderColor: Colors.muted, borderRadius: Radius.lg, padding: 12, fontSize: 16, color: Colors.foreground },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.muted },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.foreground, fontWeight: '600' },
  chipTextOn: { color: Colors.primaryForeground },
  error: { marginTop: 8, padding: 10, borderRadius: Radius.md, backgroundColor: '#fef2f2', color: Colors.destructive, fontWeight: '600' },
  primary: { marginTop: 14, alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700' },
  secondary: { alignItems: 'center', padding: 14 },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
