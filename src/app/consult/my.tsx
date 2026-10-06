import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingCard } from '@/components/consult/booking-card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors } from '@/constants/theme';
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
          action={
            <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Find a doctor">
              <Text style={styles.link}>Find a doctor</Text>
            </Pressable>
          }
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
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 8 },
  group: { gap: 10, marginTop: 8 },
  groupTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: Colors.mutedForeground },
  link: { color: Colors.primary, fontWeight: '700' },
});
