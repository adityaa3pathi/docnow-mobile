import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { Colors, Radius } from '@/constants/theme';
import { formatPaise } from '@/lib/consult/format';
import { statusInfo } from '@/lib/consult/status';
import { formatIstDateTime } from '@/lib/consult/time';
import type { BookingView } from '@/lib/consult/types';

const REFUND_SHORT = { PENDING: 'Refund on its way', PROCESSED: 'Refund sent', FAILED: 'Refund with our team' } as const;

export function BookingCard({ booking, holdLive }: { booking: BookingView; holdLive?: boolean }) {
  const info = statusInfo(booking.status);
  const refund = booking.refundPaise > 0 ? `${formatPaise(booking.refundPaise)} ${booking.refundStatus ? REFUND_SHORT[booking.refundStatus] : 'refund being prepared'}` : null;
  const label = `${booking.doctorName}, ${booking.specialty}, ${info.label}, ${formatIstDateTime(booking.startsAt)}, for ${booking.patientName}${refund ? `, ${refund}` : ''}`;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/consult/booking/[id]', params: { id: booking.consultationId } })}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={styles.top}>
        <View style={styles.topText}>
          <Text style={styles.name} numberOfLines={1}>{booking.doctorName}</Text>
          <Text style={styles.muted}>{booking.specialty}</Text>
        </View>
        <Badge tone={info.tone}>{info.label}</Badge>
      </View>
      <Text style={styles.when}>{formatIstDateTime(booking.startsAt)}</Text>
      <Text style={styles.small}>For {booking.patientName} · {formatPaise(booking.amountPaise)}</Text>
      {refund ? <Text style={styles.refund}>{refund}</Text> : null}
      {holdLive ? <Text style={styles.cta}>Continue to pay</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  topText: { flex: 1 },
  name: { fontWeight: '700', fontSize: 16, color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  when: { marginTop: 4, fontWeight: '600', color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  refund: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  cta: { marginTop: 6, fontWeight: '700', color: Colors.primary },
});
