import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { PatientPrescription } from '@/components/consult/patient-prescription';
import { Colors } from '@/constants/theme';

/** Target of `docnow://records/prescription/<consultationId>`, e.g. from a "Prescription issued" push. */
export default function PrescriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <PatientPrescription bookingId={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
});
