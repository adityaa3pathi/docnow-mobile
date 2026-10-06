import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorAvatar } from '@/components/consult/doctor-card';
import { SlotPicker } from '@/components/consult/slot-picker';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { consult, errorStatus, friendlyError } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';
import { formatIstDateTime, serverNow } from '@/lib/consult/time';

const NOTICES: Record<string, string> = {
  slot_gone: 'That time is no longer available. Please pick another.',
  slot_taken: 'Someone else just booked that time. Please pick another.',
};

export default function DoctorScreen() {
  const { id, notice: noticeKey } = useLocalSearchParams<{ id: string; notice?: string }>();
  const insets = useSafeAreaInsets();
  const doctor = useQuery({ queryKey: ['consult', 'doctor', id], queryFn: () => consult.doctor(id) });
  // A quiet refresh makes a slot taken by someone else disappear without a reload.
  const slotsQuery = useQuery({ queryKey: ['consult', 'slots', id], queryFn: () => consult.slots(id), refetchInterval: 60_000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slots = useMemo(() => (slotsQuery.data ?? []).filter((s) => Date.parse(s.startsAt) > serverNow()), [slotsQuery.data]);
  const selected = slots.find((s) => s.id === selectedId);
  const dropped = Boolean(selectedId && !selected && slotsQuery.data);
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;

  if (doctor.isLoading) return <LoadingBlock label="Loading doctor" />;
  if (!doctor.data) {
    const notFound = errorStatus(doctor.error) === 404;
    return (
      <View style={styles.pad}>
        {notFound ? (
          <EmptyState title="Doctor not found" body="This doctor is not available." />
        ) : (
          <ErrorState message={friendlyError(doctor.error)} onRetry={() => void doctor.refetch()} />
        )}
      </View>
    );
  }

  const d = doctor.data;
  const years = `${d.experienceYears} ${d.experienceYears === 1 ? 'year' : 'years'}`;
  const goBook = () => {
    if (selected) router.push({ pathname: '/consult/book', params: { doctorId: d.id, slotId: selected.id } });
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {notice ? (
          <Text style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">{notice}</Text>
        ) : null}

        <View style={styles.card}>
          <View style={styles.top}>
            <DoctorAvatar doctor={d} size={80} />
            <View style={styles.topText}>
              <Text style={styles.name} accessibilityRole="header">{d.displayName}</Text>
              <Text style={styles.specialty}>{d.specialty.name}</Text>
              <Text style={styles.muted}>{d.qualification}</Text>
            </View>
          </View>
          <View style={styles.facts}>
            <Fact label="Experience" value={years} />
            <Fact label="Fee" value={formatRupees(d.consultationFee)} />
            {d.languages.length > 0 ? <Fact label="Languages" value={d.languages.join(', ')} /> : null}
            <Fact label="Visit length" value={`${d.slotMinutes} minutes`} />
          </View>
          {d.bio ? <Text style={styles.bio}>{d.bio}</Text> : null}
          <Text style={styles.small}>Registration: {d.registrationNumber} ({d.registrationCouncil})</Text>
        </View>

        <Text style={styles.h2} accessibilityRole="header">Pick a time</Text>
        {slotsQuery.isLoading ? <LoadingBlock label="Loading times" /> : null}
        {!slotsQuery.isLoading && slotsQuery.error ? (
          <ErrorState message={friendlyError(slotsQuery.error)} onRetry={() => void slotsQuery.refetch()} />
        ) : null}
        {!slotsQuery.isLoading && !slotsQuery.error && slots.length === 0 ? (
          <EmptyState title="No free times in the next 14 days" body="This doctor has nothing open right now." />
        ) : null}
        {!slotsQuery.error && slots.length > 0 ? <SlotPicker slots={slots} selectedId={selectedId} onSelect={(s) => setSelectedId(s.id)} /> : null}
        {dropped ? (
          <Text style={styles.warn} accessibilityRole="alert" accessibilityLiveRegion="polite">
            The time you chose was just taken. Please pick another.
          </Text>
        ) : null}
      </ScrollView>

      {selected ? (
        <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.barText}>
            <Text style={styles.tiny}>Your time</Text>
            <Text style={styles.when} numberOfLines={1}>{formatIstDateTime(selected.startsAt)}</Text>
          </View>
          <Pressable style={styles.button} onPress={goBook} accessibilityRole="button" accessibilityLabel={`Continue to book ${formatIstDateTime(selected.startsAt)}`}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tiny}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 16 },
  notice: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' },
  warn: { color: '#92400e', fontWeight: '600' },
  card: { gap: 14, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted },
  top: { flexDirection: 'row', gap: 14 },
  topText: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  specialty: { fontWeight: '600', color: Colors.primary },
  muted: { color: Colors.mutedForeground },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  fact: { minWidth: '45%' },
  factValue: { fontWeight: '600', color: Colors.foreground },
  tiny: { fontSize: 12, color: Colors.mutedForeground },
  bio: { color: Colors.foreground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  h2: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.muted, backgroundColor: Colors.background },
  barText: { flex: 1 },
  when: { fontWeight: '700', color: Colors.foreground },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  buttonText: { color: Colors.primaryForeground, fontWeight: '700' },
});
