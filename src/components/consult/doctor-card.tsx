import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import type { DoctorSummary } from '@/lib/consult/types';

export function initials(name: string) {
  return name.replace(/^dr\.?\s+/i, '').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DoctorAvatar({ doctor, size = 64 }: { doctor: Pick<DoctorSummary, 'displayName' | 'photoUrl'>; size?: number }) {
  // A round frame reads as a person, whether it holds a real photo or initials.
  const box = { width: size, height: size, borderRadius: Radius.full };
  if (doctor.photoUrl) return <Image source={{ uri: doctor.photoUrl }} style={box} accessibilityElementsHidden />;
  return (
    <View style={[styles.avatar, box]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.initials, { fontSize: size / 3 }]}>{initials(doctor.displayName)}</Text>
    </View>
  );
}

export function DoctorCard({ doctor }: { doctor: DoctorSummary }) {
  const years = `${doctor.experienceYears} ${doctor.experienceYears === 1 ? 'year' : 'years'} experience`;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/consult/doctor/${doctor.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${doctor.displayName}, ${doctor.specialty.name}, ${years}, fee ${formatRupees(doctor.consultationFee)}`}>
      <DoctorAvatar doctor={doctor} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{doctor.displayName}</Text>
        <Text style={styles.specialty}>{doctor.specialty.name}</Text>
        <Text style={styles.muted} numberOfLines={1}>{doctor.qualification}</Text>
        {/* The quiet fact line carries experience, languages and fee instead of badges. */}
        <Text style={styles.facts}>
          {years}
          {doctor.languages.length > 0 ? ` · ${doctor.languages.join(', ')}` : ''}
          {` · ${formatRupees(doctor.consultationFee)}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Space[4], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  avatar: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: Fonts.semibold, color: Colors.primary },
  body: { flex: 1, gap: Space[1] },
  name: { ...Type.bodyStrong, color: Colors.ink },
  specialty: { ...Type.small, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  facts: { ...Type.small, color: Colors.inkMuted, fontVariant: ['tabular-nums'] },
});
