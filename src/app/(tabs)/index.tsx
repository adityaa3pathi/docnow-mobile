import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DoctorCard } from '@/components/consult/doctor-card';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';

export default function ConsultHome() {
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const doctors = useQuery({
    queryKey: ['consult', 'doctors', specialtyId],
    queryFn: () => consult.doctors(specialtyId ?? undefined),
  });

  const refresh = () => {
    void specialties.refetch();
    void doctors.refetch();
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title} accessibilityRole="header">Talk to a doctor</Text>
          <Text style={styles.muted}>Pick a doctor, choose a time and pay to book.</Text>
        </View>
        <Pressable
          style={styles.myButton}
          onPress={() => router.push('/consult/my')}
          accessibilityRole="button"
          accessibilityLabel="My consultations">
          <Text style={styles.myText}>My consultations</Text>
        </Pressable>
      </View>
      {specialties.data && specialties.data.length > 0 ? (
        <View style={styles.chips}>
          <SpecialtyChips specialties={specialties.data} value={specialtyId} onChange={setSpecialtyId} />
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
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
          {doctors.isLoading ? <LoadingBlock label="Loading doctors" /> : null}
          {doctors.error ? <ErrorState message={friendlyError(doctors.error)} onRetry={() => void doctors.refetch()} /> : null}
          {!doctors.isLoading && !doctors.error ? (
            <EmptyState
              title="No doctors found"
              body={specialtyId ? 'No doctors are available for this specialty right now.' : 'No doctors are available right now. Please check back soon.'}
              action={
                specialtyId ? (
                  <Pressable onPress={() => setSpecialtyId(null)} accessibilityRole="button" accessibilityLabel="Show all doctors">
                    <Text style={styles.link}>Show all doctors</Text>
                  </Pressable>
                ) : undefined
              }
            />
          ) : null}
        </View>
      }
      refreshControl={<RefreshControl refreshing={doctors.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  header: { gap: 14, paddingTop: 16, paddingBottom: 12 },
  titleRow: { paddingHorizontal: 16, gap: 12 },
  titleText: { gap: 2 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  myButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  myText: { color: Colors.primary, fontWeight: '700' },
  chips: { marginTop: 2 },
  cardWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  link: { color: Colors.primary, fontWeight: '700' },
});
