import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
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
  wrap: { gap: Space[4] },
  section: { gap: Space[1] },
  small: { ...Type.small, color: Colors.inkMuted },
  heading: { ...Type.bodyStrong, color: Colors.ink },
  medicine: { gap: Space[1], paddingHorizontal: Space[3], paddingVertical: Space[2], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  medName: { ...Type.bodyStrong, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  body: { ...Type.body, color: Colors.ink },
});
