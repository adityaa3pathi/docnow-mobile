import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorAvatar } from '@/components/consult/doctor-card';
import { SlotPicker } from '@/components/consult/slot-picker';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { LightStatusBar } from '@/components/ui/light-status-bar';
import { Colors, Fonts, Radius, Shadow, Space, Type } from '@/constants/theme';
import { consult, errorStatus, friendlyError } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';
import { formatIstDateTime, nextFreeLabel, serverNow } from '@/lib/consult/time';

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

  const nextFree = slots[0] ? nextFreeLabel(slots[0].startsAt) : slotsQuery.isLoading ? '…' : 'No times yet';
  const facts = [
    { label: 'Next free', value: nextFree },
    { label: 'Fee', value: `${formatRupees(d.consultationFee)} · ${d.slotMinutes} min` },
    { label: 'Experience', value: years },
    ...(d.languages.length > 0 ? [{ label: 'Speaks', value: d.languages.join(', ') }] : []),
  ];
  const gets = [
    `A ${d.slotMinutes}-minute video call (switch to audio any time)`,
    'A digital prescription on your phone',
    'Recommended tests added to your cart in one tap',
    'Book for yourself or a family member',
  ];

  return (
    <View style={styles.flex}>
      <LightStatusBar />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.band}>
          <View style={styles.top}>
            <DoctorAvatar doctor={d} size={80} />
            <View style={styles.topText}>
              <Text style={styles.name} accessibilityRole="header">{d.displayName}</Text>
              <Text style={styles.specialty}>{d.specialty.name} · {d.qualification}</Text>
            </View>
          </View>
          {/* Key facts in the band, so the decision needs no scrolling. */}
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact} accessible accessibilityLabel={`${f.label}: ${f.value}`}>
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {notice ? (
            <Text style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">{notice}</Text>
          ) : null}

          <View style={styles.card}>
            {d.bio ? (
              <View style={styles.section}>
                <Text style={styles.h2} accessibilityRole="header">About</Text>
                <Text style={styles.bio}>{d.bio}</Text>
              </View>
            ) : null}
            <View style={[styles.section, d.bio ? styles.divided : null]}>
              <Text style={styles.h2} accessibilityRole="header">What you get</Text>
              {gets.map((g) => (
                <View key={g} style={styles.getRow}>
                  <View style={styles.tick}><View style={styles.tickDot} /></View>
                  <Text style={styles.getText}>{g}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.small, styles.divided]}>Registration: {d.registrationNumber} ({d.registrationCouncil})</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.priceHead}>
              <Text style={styles.label}>Consultation</Text>
              <Text style={styles.priceLine}>
                <Text style={styles.price}>{formatRupees(d.consultationFee)}</Text>
                <Text style={styles.label}>{` · ${d.slotMinutes} min`}</Text>
              </Text>
            </View>
            <View>
              <Text style={styles.h2} accessibilityRole="header">Pick a time</Text>
              <Text style={styles.label}>All times are Indian time.</Text>
            </View>
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
          </View>
        </View>
      </ScrollView>

      {selected ? (
        <View style={[styles.bar, { paddingBottom: Space[3] + insets.bottom }]}>
          <View style={styles.barText}>
            <Text style={styles.label}>Your time</Text>
            <Text style={styles.when} numberOfLines={1}>{formatIstDateTime(selected.startsAt)}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={goBook}
            accessibilityRole="button"
            accessibilityLabel={`Continue to payment for ${formatIstDateTime(selected.startsAt)}`}>
            <Text style={styles.buttonText}>Continue to payment</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// Purple band with fact tiles, then white cards on a soft page (matches the website doctor page).
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  pad: { padding: Space[4] },
  content: { paddingBottom: Space[8] },
  band: { gap: Space[6], paddingHorizontal: Space[4], paddingTop: Space[2], paddingBottom: Space[6], backgroundColor: Colors.primaryHover },
  top: { flexDirection: 'row', alignItems: 'center', gap: Space[4] },
  topText: { flex: 1, gap: Space[1] },
  name: { ...Type.title, fontFamily: Fonts.bold, color: Colors.onPrimary },
  specialty: { ...Type.body, fontFamily: Fonts.medium, color: Colors.primarySoft },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[3] },
  fact: { flexBasis: '47%', flexGrow: 1, paddingHorizontal: Space[4], paddingVertical: Space[3], borderRadius: Radius.lg, backgroundColor: Colors.primary },
  factLabel: { ...Type.small, color: Colors.primarySoft },
  factValue: { ...Type.bodyStrong, fontFamily: Fonts.bold, color: Colors.onPrimary, fontVariant: ['tabular-nums'] },
  body: { gap: Space[4], padding: Space[4] },
  notice: { ...Type.small, padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.warningSoft, color: Colors.warningInk },
  warn: { ...Type.small, color: Colors.warningInk },
  card: { gap: Space[4], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  section: { gap: Space[3] },
  divided: { paddingTop: Space[4], borderTopWidth: 1, borderTopColor: Colors.border },
  h2: { ...Type.bodyLg, fontFamily: Fonts.bold, color: Colors.ink },
  bio: { ...Type.body, color: Colors.ink },
  getRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
  tick: { width: 24, height: 24, borderRadius: Radius.full, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tickDot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.primary },
  getText: { ...Type.body, flex: 1, color: Colors.ink },
  priceHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Space[3], marginHorizontal: -Space[4], marginTop: -Space[4], paddingHorizontal: Space[4], paddingVertical: Space[3], borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  priceLine: { color: Colors.ink },
  price: { ...Type.title, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  label: { ...Type.small, color: Colors.inkMuted },
  small: { ...Type.small, color: Colors.inkMuted },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingHorizontal: Space[4], paddingTop: Space[3], borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, ...Shadow.raised },
  barText: { flex: 1 },
  when: { ...Type.bodyStrong, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  button: { justifyContent: 'center', minHeight: 48, paddingHorizontal: Space[6], borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonPressed: { backgroundColor: Colors.primaryHover },
  buttonText: { ...Type.bodyStrong, fontFamily: Fonts.semibold, color: Colors.onPrimary },
});
