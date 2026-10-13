import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { parseFollowUp } from '@/lib/consult/roomText';
import { formatIstTime } from '@/lib/consult/time';
import type { ConsultNote } from '@/lib/consult/types';

const FIELDS = [
  { key: 'complaints', label: 'Complaints', max: 2000 },
  { key: 'findings', label: 'Findings', max: 2000 },
  { key: 'diagnosis', label: 'Diagnosis', max: 1000 },
  { key: 'advice', label: 'Advice', max: 2000 },
] as const;

type Key = (typeof FIELDS)[number]['key'];
type Form = Record<Key, string> & { followUp: string };

const fromNote = (n: ConsultNote | null): Form => ({
  complaints: n?.complaints ?? '', findings: n?.findings ?? '', diagnosis: n?.diagnosis ?? '', advice: n?.advice ?? '',
  followUp: n?.followUpDays ? String(n.followUpDays) : '',
});

interface Props {
  consultationId: string;
  note: ConsultNote | null;
  /** Why notes cannot be edited right now, or null when they can. */
  lockedReason: string | null;
}

/** Private doctor notes. Saves when a field loses focus, or on Save. */
export function NotesForm({ consultationId, note, lockedReason }: Props) {
  const [form, setForm] = useState<Form>(() => fromNote(note));
  const saved = useRef(JSON.stringify(fromNote(note)));
  const [savedAt, setSavedAt] = useState<string | null>(note?.updatedAt ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = lockedReason !== null;

  async function save(force: boolean) {
    const snapshot = JSON.stringify(form);
    if (locked || saving || (!force && snapshot === saved.current)) return;
    const days = parseFollowUp(form.followUp);
    if (days === undefined) {
      setError('Follow-up must be a whole number of days, 1 to 365.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await doctorApi.saveNotes(consultationId, {
        complaints: form.complaints, findings: form.findings, diagnosis: form.diagnosis, advice: form.advice, followUpDays: days,
      });
      saved.current = snapshot;
      setSavedAt(res.updatedAt);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof Form) => (text: string) => setForm((f) => ({ ...f, [key]: text }));

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">Notes</Text>
        <Text style={styles.small} accessibilityLiveRegion="polite">
          {saving ? 'Saving...' : savedAt ? `Saved ${formatIstTime(savedAt)} IST` : ''}
        </Text>
      </View>
      {lockedReason ? <Notice>{lockedReason}</Notice> : null}
      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={[styles.input, styles.multiline, locked && styles.locked]}
            value={form[f.key]}
            maxLength={f.max}
            editable={!locked}
            multiline
            textAlignVertical="top"
            onChangeText={set(f.key)}
            onBlur={() => void save(false)}
            accessibilityLabel={f.label}
          />
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.label}>Follow up after (days)</Text>
        <TextInput
          style={[styles.input, locked && styles.locked]}
          value={form.followUp}
          keyboardType="number-pad"
          maxLength={3}
          editable={!locked}
          onChangeText={set('followUp')}
          onBlur={() => void save(false)}
          accessibilityLabel="Follow up after, in days"
        />
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!locked ? <ActionButton label="Save notes" busyLabel="Saving..." variant="soft" busy={saving} onPress={() => void save(true)} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  field: { gap: 4 },
  label: { fontWeight: '600', color: Colors.foreground },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: Colors.foreground },
  multiline: { minHeight: 88 },
  locked: { opacity: 0.6 },
});
