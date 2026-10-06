import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { Colors, Radius } from '@/constants/theme';
import { doctorStatusLabel } from '@/lib/consult/doctorConsultations';
import { formatIstDay, formatIstTime } from '@/lib/consult/time';
import type { DoctorConsultation } from '@/lib/consult/types';

/** Only the patient's name is shown. No phone, payment or refund detail ever reaches this screen. */
export function ConsultationRow({ item }: { item: DoctorConsultation }) {
  const status = doctorStatusLabel(item.status);
  const when = `${formatIstDay(item.startsAt)}, ${formatIstTime(item.startsAt)} to ${formatIstTime(item.endsAt)}`;
  return (
    <View style={styles.card} accessible accessibilityLabel={`${item.patientName}, ${when}, Indian time, ${status.label}`}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{item.patientName}</Text>
        <Badge tone={status.tone}>{status.label}</Badge>
      </View>
      <Text style={styles.when}>{when}</Text>
      <Text style={styles.small}>Indian time</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, fontWeight: '700', fontSize: 16, color: Colors.foreground },
  when: { fontWeight: '600', color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
});
