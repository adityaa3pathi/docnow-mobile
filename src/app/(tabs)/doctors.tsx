import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorCard } from '@/components/consult/doctor-card';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius, Type } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';

/** Consult tab: every verified doctor, filterable by specialty (the filter lives in the URL). */
export default function DoctorsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ specialty?: string }>();
  const specialtyId = params.specialty || null;

  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const doctors = useQuery({
    queryKey: ['consult', 'doctors', specialtyId],
    queryFn: () => consult.doctors(specialtyId ?? undefined),
  });
  const setSpecialty = (id: string | null) => router.setParams({ specialty: id ?? '' });
  const picked = specialties.data?.find((s) => s.id === specialtyId);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Consult a Doctor</Text>
          <Text style={styles.subtitle}>Video consultations with verified doctors</Text>
        </View>
        <Pressable
          style={styles.myBtn}
          onPress={() => router.push('/consult/my')}
          accessibilityRole="button"
          accessibilityLabel="My consultations">
          <CalendarClock size={18} color={Colors.primary} />
          <Text style={styles.myText}>My Consults</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      </View>
      {specialties.data && specialties.data.length > 0 ? (
        <SpecialtyChips specialties={specialties.data} value={specialtyId} onChange={setSpecialty} />
      ) : null}
      {doctors.data && doctors.data.length > 0 ? (
        <Text style={styles.count}>
          {doctors.data.length} {doctors.data.length === 1 ? 'doctor' : 'doctors'}
          {picked ? ` in ${picked.name}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={doctors.isLoading || doctors.error ? [] : (doctors.data ?? [])}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <DoctorCard doctor={item} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.cardWrap}>
            {doctors.isLoading ? <LoadingBlock label="Loading verified doctors..." /> : null}
            {doctors.error ? <ErrorState message={friendlyError(doctors.error)} onRetry={() => void doctors.refetch()} /> : null}
            {!doctors.isLoading && !doctors.error ? (
              <EmptyState
                title="No doctors found"
                body={specialtyId ? 'No doctors are available for this specialty right now.' : 'No doctors are currently available. Please check back soon.'}
                action={
                  specialtyId ? (
                    <Pressable onPress={() => setSpecialty(null)} accessibilityRole="button">
                      <Text style={styles.link}>Show all doctors</Text>
                    </Pressable>
                  ) : undefined
                }
              />
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={doctors.isRefetching}
            onRefresh={() => {
              void specialties.refetch();
              void doctors.refetch();
            }}
            tintColor={Colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  flex: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 8, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  title: { fontSize: Type.hero, fontWeight: '800', color: Colors.foreground },
  subtitle: { fontSize: Type.body - 1, color: Colors.mutedForeground, marginTop: 2 },
  myBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 10, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  myText: { fontSize: Type.caption, fontWeight: '800', color: Colors.primary },
  count: { paddingHorizontal: 16, fontSize: Type.caption, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  link: { color: Colors.primary, fontWeight: '700', fontSize: Type.body },
});
