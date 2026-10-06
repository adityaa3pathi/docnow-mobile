import { router, type Href } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ConsultationRow } from '@/components/doctor/consultation-row';
import { Card } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { useDoctorConsultations } from '@/hooks/use-doctor-consultations';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { friendlyError } from '@/lib/consult/api';

const LINKS: { label: string; hint: string; href: Href }[] = [
  { label: 'Consultations', hint: 'Upcoming and past bookings', href: '/doctor/consultations' },
  { label: 'Weekly hours', hint: 'Set when patients can book you', href: '/doctor/hours' },
  { label: 'Leave', hint: 'Block days or times you are away', href: '/doctor/leave' },
];

export function DoctorHome() {
  const me = useDoctorMe();
  const next = useDoctorConsultations('upcoming');

  if (me.isLoading) return <LoadingBlock label="Loading your doctor page" />;
  if (!me.data) {
    return <View style={styles.pad}><ErrorState message={me.error ? friendlyError(me.error) : 'We could not load your doctor page.'} onRetry={() => void me.refetch()} /></View>;
  }
  const first = next.items[0];
  const refresh = () => {
    void me.refetch();
    void next.refetch();
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={me.isRefetching || next.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}>
      <Text style={styles.title} accessibilityRole="header">Hello, {me.data.displayName}</Text>

      <Card>
        <Text style={styles.heading} accessibilityRole="header">Next consultation</Text>
        {next.isLoading ? (
          <LoadingBlock label="Loading" />
        ) : next.error ? (
          <ErrorState message={friendlyError(next.error)} onRetry={() => void next.refetch()} />
        ) : first ? (
          <ConsultationRow item={first} />
        ) : (
          <Text style={styles.muted}>Nothing booked yet. When a patient books you, it shows here.</Text>
        )}
      </Card>

      {LINKS.map((l) => (
        <Pressable
          key={l.label}
          style={styles.row}
          onPress={() => router.push(l.href)}
          accessibilityRole="button"
          accessibilityLabel={`${l.label}. ${l.hint}`}>
          <Text style={styles.rowTitle}>{l.label}</Text>
          <Text style={styles.muted}>{l.hint}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  heading: { fontSize: 14, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase' },
  muted: { color: Colors.mutedForeground },
  row: { gap: 2, padding: 16, minHeight: 56, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted },
  rowTitle: { fontWeight: '700', color: Colors.foreground },
});
