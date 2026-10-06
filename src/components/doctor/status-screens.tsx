import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors } from '@/constants/theme';
import { doctorStatusInfo } from '@/lib/consult/status';
import type { DoctorMe } from '@/lib/consult/types';

interface Props {
  doctor: DoctorMe;
  /** Re-reads the status from the server. Resolves true when the call worked. */
  onCheck: () => Promise<boolean>;
}

function useCheck(onCheck: Props['onCheck'], same: string) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const run = async () => {
    setBusy(true);
    setNote(null);
    const ok = await onCheck();
    setNote(ok ? { text: same, ok: true } : { text: 'We could not check right now. Please try again.', ok: false });
    setBusy(false);
  };
  return { busy, note, run };
}

export function PendingScreen({ doctor, onCheck }: Props) {
  const info = doctorStatusInfo('PENDING');
  const check = useCheck(onCheck, 'Checked just now. Your application is still waiting for review.');
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card>
        <Badge tone={info.tone}>{info.label}</Badge>
        <Text style={styles.title} accessibilityRole="header">Thanks, {doctor.displayName}</Text>
        <Text style={styles.body}>We are checking your details. You can set your hours once you are approved.</Text>
        <ActionButton label="Check status" busyLabel="Checking..." busy={check.busy} onPress={() => void check.run()} />
      </Card>
      {check.note ? <Notice tone={check.note.ok ? 'info' : 'error'}>{check.note.text}</Notice> : null}
    </ScrollView>
  );
}

export function SuspendedScreen({ doctor, onCheck }: Props) {
  const info = doctorStatusInfo('SUSPENDED');
  const check = useCheck(onCheck, 'Checked just now. Your account is still paused.');
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card>
        <Badge tone={info.tone}>{info.label}</Badge>
        <Text style={styles.title} accessibilityRole="header">Your account is paused</Text>
        {doctor.statusReason ? <Notice tone="error">Reason: {doctor.statusReason}</Notice> : null}
        <Text style={styles.body}>Patients cannot book you right now. Please contact the DocNow team to sort this out.</Text>
        <ActionButton label="Check status" busyLabel="Checking..." busy={check.busy} onPress={() => void check.run()} />
      </Card>
      {check.note ? <Notice tone={check.note.ok ? 'info' : 'error'}>{check.note.text}</Notice> : null}
    </ScrollView>
  );
}

export function RejectedNotice({ doctor }: { doctor: DoctorMe }) {
  const info = doctorStatusInfo('REJECTED');
  return (
    <Card>
      <Badge tone={info.tone}>{info.label}</Badge>
      <Text style={styles.title} accessibilityRole="header">Your application needs changes</Text>
      {doctor.statusReason ? <Notice tone="error">Reason: {doctor.statusReason}</Notice> : null}
      <Text style={styles.body}>Fix the details below and send it again.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  body: { color: Colors.mutedForeground, lineHeight: 21 },
});
