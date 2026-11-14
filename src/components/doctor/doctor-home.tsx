import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ConsultationRow } from '@/components/doctor/consultation-row';
import { DoctorPhotoUpload } from '@/components/doctor/photo-upload';
import { Card } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { useDoctorConsultations } from '@/hooks/use-doctor-consultations';
import { DOCTOR_ME_KEY, useDoctorMe } from '@/hooks/use-doctor-me';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { DOCTOR_GENDERS } from '@/lib/consult/doctorForm';
import type { DoctorGender, DoctorMe } from '@/lib/consult/types';

const LINKS: { label: string; hint: string; href: Href }[] = [
  { label: 'Consultations', hint: 'Upcoming and past bookings', href: '/doctor/consultations' },
  { label: 'Weekly hours', hint: 'Set when patients can book you', href: '/doctor/hours' },
  { label: 'Leave', hint: 'Block days or times you are away', href: '/doctor/leave' },
];

/** Photo and gender, the two details patients filter and choose on. Each change saves on its own. */
function ProfileCard({ doctor }: { doctor: DoctorMe }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cache = (next: DoctorMe) => queryClient.setQueryData(DOCTOR_ME_KEY, next);

  const saveGender = async (gender: DoctorGender) => {
    setError(null);
    setSaving(true);
    try {
      cache({ ...doctor, ...(await doctorApi.updateMe({ gender })) });
    } catch (e) {
      setError(friendlyError(e, 'We could not save your gender. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Text style={styles.cardTitle} accessibilityRole="header">Your profile photo and details</Text>
      <DoctorPhotoUpload name={doctor.displayName} photoUrl={doctor.photoUrl} onUploaded={(photoUrl) => cache({ ...doctor, photoUrl })} />
      <Text style={styles.label}>Gender</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Gender">
        {DOCTOR_GENDERS.map((g) => {
          const active = doctor.gender === g;
          return (
            <Pressable
              key={g}
              onPress={() => void saveGender(g)}
              disabled={saving}
              style={[styles.chip, active && styles.chipOn, saving && styles.off]}
              accessibilityRole="radio"
              accessibilityLabel={g}
              accessibilityState={{ selected: active, checked: active, disabled: saving }}>
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{g}</Text>
            </Pressable>
          );
        })}
      </View>
      {!doctor.gender ? <Text style={styles.muted}>Patients can filter doctors by gender. Please add yours.</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
    </Card>
  );
}

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

      <ProfileCard doctor={me.data} />

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
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  label: { fontSize: 16, fontWeight: '600', color: Colors.foreground, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  chipTextOn: { color: Colors.onPrimary },
  off: { opacity: 0.5 },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: Colors.dangerInk },
});
