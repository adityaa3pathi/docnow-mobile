import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DoctorCard } from '@/components/consult/doctor-card';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { LightStatusBar } from '@/components/ui/light-status-bar';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
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
    <View>
      <LightStatusBar />
      <View style={styles.band}>
        <Text style={styles.bandTitle} accessibilityRole="header">Talk to a doctor from home</Text>
        <Text style={styles.bandBody}>Registered doctors on video. Book a time that suits you and get your prescription on your phone.</Text>
        <Pressable
          style={({ pressed }) => [styles.myButton, pressed && styles.myButtonPressed]}
          onPress={() => router.push('/consult/my')}
          accessibilityRole="button"
          accessibilityLabel="My consultations">
          <Text style={styles.myText}>My consultations</Text>
        </Pressable>
        <View style={styles.trust}>
          {['Verified registration', 'Digital prescription', 'Private and confidential'].map((t) => (
            <View key={t} style={styles.trustItem}>
              <View style={styles.dot} />
              <Text style={styles.trustText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.listHead}>
        <Text style={styles.h2} accessibilityRole="header">Choose a doctor</Text>
        {specialties.data && specialties.data.length > 0 ? (
          <SpecialtyChips specialties={specialties.data} value={specialtyId} onChange={setSpecialtyId} />
        ) : null}
      </View>
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

// Deep purple band (owner choice 08-11-2026), then white list; buttons on the band are white outline.
const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  content: { paddingBottom: Space[8] },
  band: { gap: Space[4], paddingHorizontal: Space[4], paddingTop: Space[2], paddingBottom: Space[6], backgroundColor: Colors.primaryHover },
  bandTitle: { ...Type.titleLg, fontFamily: Fonts.bold, color: Colors.onPrimary },
  bandBody: { ...Type.body, color: Colors.primarySoft },
  myButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primarySoft },
  myButtonPressed: { backgroundColor: Colors.primary },
  myText: { ...Type.bodyStrong, color: Colors.onPrimary },
  trust: { gap: Space[2] },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  dot: { width: 6, height: 6, borderRadius: Radius.full, backgroundColor: Colors.primarySoft },
  trustText: { ...Type.small, color: Colors.primarySoft },
  listHead: { gap: Space[3], paddingTop: Space[6], paddingBottom: Space[4] },
  h2: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, paddingHorizontal: Space[4] },
  cardWrap: { paddingHorizontal: Space[4], paddingBottom: Space[4] },
  link: { ...Type.bodyStrong, color: Colors.primary },
});
