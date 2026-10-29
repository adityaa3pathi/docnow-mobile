import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { formatIstDateTime } from '@/lib/consult/time';
import type { Prescription } from '@/lib/consult/types';

interface Props {
  prescription: Prescription;
}

export function PrescriptionView({ prescription }: Props) {
  const { medicines, recommendedTests, advice, doctorSnapshot: doc } = prescription;

  return (
    <View style={styles.container}>
      <Text style={styles.issued}>
        Issued {formatIstDateTime(prescription.issuedAt)} by {doc.displayName}, {doc.qualification} (Reg. {doc.registrationNumber})
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines</Text>
        {medicines.length === 0 ? (
          <Text style={styles.muted}>No medicines prescribed.</Text>
        ) : (
          <View style={styles.list}>
            {medicines.map((m, i) => (
              <View key={i} style={styles.medicineCard}>
                <Text style={styles.medName}>
                  {m.name}
                  {m.dose ? ` · ${m.dose}` : ''}
                </Text>
                <Text style={styles.medDetail}>
                  {[m.frequency, m.duration, m.instructions].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {recommendedTests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Tests</Text>
          <View style={styles.testList}>
            {recommendedTests.map((t) => (
              <View key={t.code} style={styles.testBadge}>
                <Text style={styles.testText}>• {t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {advice ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor&apos;s Advice</Text>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  issued: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  muted: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  list: {
    gap: 8,
  },
  medicineCard: {
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
    gap: 4,
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  medDetail: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  testList: {
    gap: 6,
  },
  testBadge: {
    paddingVertical: 2,
  },
  testText: {
    fontSize: 14,
    color: Colors.foreground,
    fontWeight: '500',
  },
  adviceText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
});
