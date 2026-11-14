import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { formatSlot } from '@/lib/lab/bookings';
import { amountSummary } from '@/lib/lab/money';
import { labStatusFor } from '@/lib/lab/status';
import type { LabBooking } from '@/lib/lab/types';

export function BookingRow({ booking }: { booking: LabBooking }) {
    const info = labStatusFor(booking);
    const slot = formatSlot(booking);
    const money = amountSummary({ totalAmount: booking.totalAmount, paymentStatus: booking.paymentStatus });
    const tests = booking.items.length > 0 ? booking.items.join(', ') : 'Lab tests';
    const reference = booking.currentPartnerBookingId ?? booking.partnerBookingId ?? booking.id.slice(0, 8);

    return (
        <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/lab/booking/[id]', params: { id: booking.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${tests}, ${slot}, ${info.label}, ${money}`}>
            <View style={styles.top}>
                <Text style={styles.tests} numberOfLines={2}>{tests}</Text>
                <Badge tone={info.tone}>{info.label}</Badge>
            </View>
            {booking.isCampBooking && booking.campName ? (
                <Text style={styles.muted}>Camp: {booking.campName}</Text>
            ) : null}
            <Text style={styles.slot}>{slot}</Text>
            <Text style={styles.muted}>{money}</Text>
            <Text style={styles.reference}>Booking {reference}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: { gap: Space[1], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Space[2] },
    tests: { ...Type.bodyStrong, flex: 1, color: Colors.ink },
    slot: { ...Type.body, marginTop: Space[1], color: Colors.ink, fontVariant: ['tabular-nums'] },
    muted: { ...Type.small, color: Colors.inkMuted, fontVariant: ['tabular-nums'] },
    reference: { ...Type.small, color: Colors.inkSubtle },
});
