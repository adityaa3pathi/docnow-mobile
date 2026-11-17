import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/doctor/consultations/[id]' as any, params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityHint="Opens the consultation"
      accessibilityLabel={`${item.patientName}, ${when}, Indian time, ${status.label}`}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{item.patientName}</Text>
        <Badge tone={status.tone}>{status.label}</Badge>
      </View>
      <View style={styles.bottom}>
        <View>
          <Text style={styles.when}>{when}</Text>
          <Text style={styles.small}>Indian time</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, fontWeight: '700', fontSize: 16, color: Colors.foreground },
  when: { fontWeight: '600', color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  pressed: { opacity: 0.7 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 24, color: Colors.primary, fontWeight: '600' },
});
