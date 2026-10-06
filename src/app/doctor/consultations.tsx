import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ConsultationRow } from '@/components/doctor/consultation-row';
import { ActionButton } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { useDoctorConsultations } from '@/hooks/use-doctor-consultations';
import { friendlyError } from '@/lib/consult/api';
import { groupByIstDay } from '@/lib/consult/doctorConsultations';

type Scope = 'upcoming' | 'past';

function List({ scope }: { scope: Scope }) {
  const q = useDoctorConsultations(scope);

  if (q.isLoading) return <LoadingBlock label="Loading consultations" />;
  if (q.error && q.items.length === 0) {
    return <View style={styles.pad}><ErrorState message={friendlyError(q.error)} onRetry={() => void q.refetch()} /></View>;
  }
  const refresh = <RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={Colors.primary} />;
  if (q.items.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.pad} refreshControl={refresh}>
        <EmptyState
          title={scope === 'upcoming' ? 'No upcoming consultations' : 'No past consultations'}
          body={scope === 'upcoming' ? 'When a patient books you, it will show up here.' : 'Finished and cancelled consultations will show up here.'}
        />
      </ScrollView>
    );
  }
  const days = groupByIstDay(q.items, scope === 'past');
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refresh}>
      {days.map((day) => (
        <View key={day.key} style={styles.group}>
          <Text style={styles.groupTitle} accessibilityRole="header">{day.label}</Text>
          {day.slots.map((item) => <ConsultationRow key={item.id} item={item} />)}
        </View>
      ))}
      {q.error ? <ErrorState message={friendlyError(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.hasNextPage ? (
        <ActionButton label="Load more" busyLabel="Loading..." variant="soft" busy={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} />
      ) : null}
    </ScrollView>
  );
}

export default function DoctorConsultations() {
  const [scope, setScope] = useState<Scope>('upcoming');
  return (
    <View style={styles.flex}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['upcoming', 'past'] as const).map((s) => {
          const active = scope === s;
          const label = s === 'upcoming' ? 'Upcoming' : 'Past';
          return (
            <Pressable
              key={s}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setScope(s)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <List key={scope} scope={scope} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.muted },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontWeight: '700', color: Colors.foreground },
  tabTextActive: { color: Colors.primaryForeground },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: Colors.mutedForeground },
});
