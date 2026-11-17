import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { BookingRow } from '@/components/lab/booking-row';
import { Colors, Space, Type } from '@/constants/theme';
import { useLabBookings } from '@/hooks/use-lab-bookings';
import { friendlyError } from '@/lib/consult/api';
import { groupLabBookings } from '@/lib/lab/bookings';
import type { LabBooking } from '@/lib/lab/types';

function Group({ title, items }: { title: string; items: LabBooking[] }) {
    if (items.length === 0) return null;
    return (
        <View style={styles.group} accessibilityLabel={title}>
            <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text>
            {items.map((booking) => <BookingRow key={booking.id} booking={booking} />)}
        </View>
    );
}

export default function LabBookingsScreen() {
    const { data, error, isLoading, isRefetching, refetch } = useLabBookings();

    if (isLoading) return <LoadingBlock label="Loading your lab bookings" />;
    if (error) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} />
            </View>
        );
    }

    const groups = groupLabBookings(data ?? []);
    const empty = groups.upcoming.length === 0 && groups.past.length === 0;

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
            }>
            {empty ? (
                <EmptyState title="No lab bookings yet" body="When you book a lab test, it will show up here." />
            ) : null}
            {groups.hiddenSuperseded > 0 ? (
                <Text style={styles.note}>
                    Older replaced booking references are hidden, so you only see the latest one for each order.
                </Text>
            ) : null}
            <Group title="Upcoming" items={groups.upcoming} />
            <Group title="Past" items={groups.past} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surface },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[2] },
    group: { gap: Space[3], marginTop: Space[2] },
    groupTitle: { ...Type.bodyStrong, color: Colors.inkMuted },
    note: { ...Type.small, color: Colors.inkMuted },
});
