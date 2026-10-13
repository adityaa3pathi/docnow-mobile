import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { REISSUE_REASON_MAX, REISSUE_REASON_MIN, buildPrescription, builderFromPrescription, emptyBuilder, emptyMedicine } from '@/lib/consult/room';
import type { Medicine, Prescription, PrescriptionInput } from '@/lib/consult/types';

const COLUMNS = [
  { key: 'name', label: 'Medicine', placeholder: 'Name', max: 120 },
  { key: 'dose', label: 'Dose', placeholder: '500 mg', max: 60 },
  { key: 'frequency', label: 'How often', placeholder: 'Twice a day', max: 60 },
  { key: 'duration', label: 'For how long', placeholder: '5 days', max: 60 },
  { key: 'instructions', label: 'Instructions', placeholder: 'After food', max: 200 },
] as const;

interface Props {
  consultationId: string;
  /** When set, the form corrects this version: it starts pre-filled and needs a reason. */
  correcting?: Prescription;
  onIssued: (p: Prescription) => void;
  onCancel?: () => void;
}

/** Issues a prescription, or a corrected next version. Both ask for a confirm because neither can be undone. */
export function PrescriptionBuilder({ consultationId, correcting, onIssued, onCancel }: Props) {
  const [initial] = useState(() => (correcting ? builderFromPrescription(correcting) : emptyBuilder()));
  const [rows, setRows] = useState<Medicine[]>(initial.rows);
  const [codes, setCodes] = useState(initial.codes);
  const [advice, setAdvice] = useState(initial.advice);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const issue = useMutation({
    mutationFn: (body: PrescriptionInput) => (correcting
      ? doctorApi.reissuePrescription(consultationId, { reason: reason.trim(), prescription: body })
      : doctorApi.issuePrescription(consultationId, body)),
    onSuccess: onIssued,
    onError: (e) => setError(friendlyError(e)),
  });

  const setCell = (i: number, key: keyof Medicine, value: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  function review() {
    if (correcting && reason.trim().length < REISSUE_REASON_MIN) {
      setError('Say briefly why you are correcting the prescription.');
      return;
    }
    const built = buildPrescription(rows, codes, advice);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setError(null);
    Alert.alert(
      correcting ? 'Issue the corrected prescription?' : 'Issue this prescription?',
      correcting
        ? 'The current version will be marked void and the patient will see the new one.'
        : 'The patient sees it straight away and your notes lock. Any later correction is kept as a new version.',
      [
        { text: 'Go back', style: 'cancel' },
        { text: correcting ? 'Issue corrected version' : 'Issue prescription', onPress: () => issue.mutate(built.body) },
      ],
    );
  }

  return (
    <Card>
      <Text style={styles.title} accessibilityRole="header">{correcting ? `Correct prescription (version ${correcting.version})` : 'Prescription'}</Text>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowHead}>
            <Text style={styles.rowTitle}>Medicine {i + 1}</Text>
            <Pressable onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove medicine ${i + 1}`} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
          {COLUMNS.map((c) => (
            <TextInput
              key={c.key}
              style={[styles.input, styles.rowInput]}
              value={row[c.key]}
              placeholder={`${c.label}: ${c.placeholder}`}
              placeholderTextColor={Colors.mutedForeground}
              maxLength={c.max}
              onChangeText={(t) => setCell(i, c.key, t)}
              accessibilityLabel={`${c.label} ${i + 1}`}
            />
          ))}
        </View>
      ))}
      <ActionButton label="Add medicine" variant="soft" disabled={rows.length >= 20} onPress={() => setRows((rs) => [...rs, emptyMedicine()])} />
      <View style={styles.field}>
        <Text style={styles.label}>Recommended test codes</Text>
        <TextInput style={styles.input} value={codes} onChangeText={setCodes} placeholder="e.g. CBC, TSH" placeholderTextColor={Colors.mutedForeground} autoCapitalize="characters" accessibilityLabel="Recommended test codes" />
        <Text style={styles.hint}>Catalog test codes, separated by commas. Names show after you issue.</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Advice</Text>
        <TextInput style={[styles.input, styles.multiline]} value={advice} onChangeText={setAdvice} maxLength={2000} multiline textAlignVertical="top" accessibilityLabel="Advice" />
      </View>
      {correcting ? (
        <View style={styles.field}>
          <Text style={styles.label}>Reason for the correction</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={reason}
            onChangeText={setReason}
            maxLength={REISSUE_REASON_MAX}
            multiline
            textAlignVertical="top"
            placeholder="e.g. Wrong dose for paracetamol"
            placeholderTextColor={Colors.mutedForeground}
            accessibilityLabel="Reason for the correction"
          />
          <Text style={styles.hint}>Kept with the old version. The patient does not see it.</Text>
        </View>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {onCancel ? <ActionButton label="Cancel" variant="soft" disabled={issue.isPending} onPress={onCancel} /> : null}
      <ActionButton label={correcting ? 'Issue corrected version' : 'Issue prescription'} busyLabel="Issuing..." busy={issue.isPending} onPress={review} />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  row: { gap: 8, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: Colors.mutedForeground },
  remove: { color: Colors.destructive, fontWeight: '700' },
  field: { gap: 4 },
  label: { fontWeight: '600', color: Colors.foreground },
  hint: { fontSize: 12, color: Colors.mutedForeground },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: Colors.foreground },
  rowInput: { backgroundColor: Colors.background },
  multiline: { minHeight: 88 },
});
