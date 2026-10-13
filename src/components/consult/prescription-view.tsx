import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { formatIstDateTime } from '@/lib/consult/time';
import type { Prescription } from '@/lib/consult/types';

/** Read-only prescription, shared by the patient booking screen and the doctor's consultation screen. */
export function PrescriptionView({ prescription }: { prescription: Prescription }) {
  const { medicines, recommendedTests, advice, doctorSnapshot: doc } = prescription;
  return (
    <View style={styles.wrap}>
      <Text style={styles.small}>
        Issued {formatIstDateTime(prescription.issuedAt)} (Indian time) by {doc.displayName}, {doc.qualification} (Reg. {doc.registrationNumber})
      </Text>
      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">Medicines</Text>
        {medicines.length === 0 ? <Text style={styles.muted}>No medicines.</Text> : medicines.map((m, i) => (
          <View key={i} style={styles.medicine}>
            <Text style={styles.medName}>{m.name}{m.dose ? ` · ${m.dose}` : ''}</Text>
            {[m.frequency, m.duration, m.instructions].some(Boolean) ? (
              <Text style={styles.muted}>{[m.frequency, m.duration, m.instructions].filter(Boolean).join(' · ')}</Text>
            ) : null}
          </View>
        ))}
      </View>
      {recommendedTests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">Recommended tests</Text>
          {recommendedTests.map((t) => <Text key={t.code} style={styles.body}>• {t.name}</Text>)}
        </View>
      ) : null}
      {advice ? (
        <View style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">Advice</Text>
          <Text style={styles.body}>{advice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  section: { gap: 6 },
  small: { fontSize: 12, color: Colors.mutedForeground },
  heading: { fontWeight: '700', color: Colors.foreground },
  medicine: { gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  medName: { fontWeight: '600', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  body: { color: Colors.foreground },
});
