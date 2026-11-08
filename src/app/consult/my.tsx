import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingCard } from '@/components/consult/booking-card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton } from '@/components/doctor/ui';
import { Colors, Space, Type } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { groupBookings } from '@/lib/consult/bookingFlow';
import { serverNow } from '@/lib/consult/time';
import type { BookingView } from '@/lib/consult/types';

function Group({ title, items, holdLive }: { title: string; items: BookingView[]; holdLive?: boolean }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.group} accessibilityLabel={title}>
      <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text>
      {items.map((b) => <BookingCard key={b.consultationId} booking={b} holdLive={holdLive} />)}
    </View>
  );
}

export default function MyConsultations() {
  const { data, error, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['consult', 'bookings'],
    queryFn: consult.bookings,
    // A booking changed on another screen should not show stale here.
    staleTime: 0,
  });

  if (isLoading) return <LoadingBlock label="Loading your consultations" />;
  if (error) {
    return (
      <View style={styles.pad}>
        <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} />
      </View>
    );
  }
  if (!data || data.length === 0) {
    return (
      <View style={styles.pad}>
        <EmptyState
          title="No consultations yet"
          body="When you book a doctor, it will show up here."
          action={<ActionButton label="Find a doctor" onPress={() => router.replace('/')} />}
        />
      </View>
    );
  }
  const groups = groupBookings(data, serverNow());
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
      <Group title="Upcoming" items={groups.upcoming} />
      <Group title="Waiting for payment" items={groups.unpaid} holdLive />
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
});
