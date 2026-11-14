import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ReportRow } from '@/components/lab/report-row';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { useLabBookings } from '@/hooks/use-lab-bookings';
import { friendlyError } from '@/lib/consult/api';
import { bookingsWithReports, formatSlotDate } from '@/lib/lab/bookings';

export default function LabReportsScreen() {
    const { data, error, isLoading, isRefetching, refetch } = useLabBookings();

    if (isLoading) return <LoadingBlock label="Loading your reports" />;
    if (error) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} />
            </View>
        );
    }

    const bookings = bookingsWithReports(data ?? []);

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
            }>
            {bookings.length === 0 ? (
                <EmptyState
                    title="No reports yet"
                    body="Reports appear here once the lab has shared them with us."
                />
            ) : null}
            {bookings.map((booking) => (
                <View key={booking.id} style={styles.card}>
                    <Pressable
                        style={styles.header}
                        onPress={() => router.push({ pathname: '/lab/booking/[id]', params: { id: booking.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Open the booking for ${booking.items.join(', ')}, ${formatSlotDate(booking.slotDate)}`}>
                        <Text style={styles.tests}>{booking.items.length > 0 ? booking.items.join(', ') : 'Lab tests'}</Text>
                        <Text style={styles.muted}>Collected on {formatSlotDate(booking.slotDate)}</Text>
                    </Pressable>
                    {(booking.reports ?? []).map((report, index) => (
                        <ReportRow key={report.id} report={report} index={index} />
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3] },
    card: { gap: Space[1], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    header: { gap: 2, minHeight: 44, justifyContent: 'center' },
    tests: { ...Type.bodyStrong, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted },
});
