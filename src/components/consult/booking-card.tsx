import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { Colors, Radius, Space, Type } from '@/constants/theme';
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
      <Text style={styles.small}>
        {booking.isBookedForYou
          ? `Booked for you by ${booking.bookedBy?.name ?? 'your family member'}`
          : `For ${booking.patientName} · ${formatPaise(booking.amountPaise)}`}
      </Text>
      {refund ? <Text style={styles.refund}>{refund}</Text> : null}
      {holdLive ? <Text style={styles.cta}>Continue to pay</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Space[1], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Space[2] },
  topText: { flex: 1 },
  name: { ...Type.bodyStrong, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  when: { ...Type.body, marginTop: Space[1], color: Colors.ink, fontVariant: ['tabular-nums'] },
  small: { ...Type.small, color: Colors.inkMuted, fontVariant: ['tabular-nums'] },
  refund: { ...Type.small, color: Colors.inkMuted },
  cta: { ...Type.bodyStrong, marginTop: Space[1], color: Colors.primary },
});
