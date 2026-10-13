import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { PrescriptionView } from '@/components/consult/prescription-view';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { sharePdf } from '@/lib/consult/pdf';
import { formatIstDateTime } from '@/lib/consult/time';
import type { Prescription, PrescriptionVersion } from '@/lib/consult/types';

function EarlierVersions({ versions }: { versions: PrescriptionVersion[] }) {
  const [open, setOpen] = useState(false);
  if (versions.length === 0) return null;
  return (
    <View style={styles.versions}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? 'Hide' : 'Show'} earlier versions ({versions.length})</Text>
      </Pressable>
      {open ? versions.map((v) => (
        <View key={v.id} style={styles.version}>
          <Text style={styles.versionTitle}>Version {v.version}</Text>
          <Text style={styles.muted}>Issued {formatIstDateTime(v.issuedAt)} IST</Text>
          <Text style={styles.muted}>Voided {formatIstDateTime(v.voidedAt)} IST</Text>
          {v.voidReason ? <Text style={styles.muted}>Reason: {v.voidReason}</Text> : null}
        </View>
      )) : null}
    </View>
  );
}

interface Props {
  consultationId: string;
  prescription: Prescription;
  previousVersions: PrescriptionVersion[];
  onCorrect: () => void;
}

export function IssuedPrescription({ consultationId, prescription, previousVersions, onCorrect }: Props) {
  const pdf = useMutation({
    mutationFn: async () => sharePdf(await doctorApi.prescriptionPdf(consultationId), `docnow-prescription-${consultationId.slice(0, 8)}.pdf`),
  });
  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">Prescription issued</Text>
        <Badge tone="info">{`Version ${prescription.version}`}</Badge>
      </View>
      <PrescriptionView prescription={prescription} />
      <ActionButton label="Download prescription (PDF)" busyLabel="Downloading..." variant="soft" busy={pdf.isPending} onPress={() => pdf.mutate()} />
      {pdf.error ? <Notice tone="error">{friendlyError(pdf.error, 'We could not download the prescription. Please try again.')}</Notice> : null}
      <ActionButton label="Correct prescription" variant="soft" onPress={onCorrect} />
      <EarlierVersions versions={previousVersions} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  versions: { gap: 8 },
  toggle: { minHeight: 44, justifyContent: 'center' },
  toggleText: { color: Colors.primary, fontWeight: '700' },
  version: { gap: 2, padding: 12, borderRadius: Radius.lg, backgroundColor: '#f3f4f6' },
  versionTitle: { fontWeight: '700', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
});
