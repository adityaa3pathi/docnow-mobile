import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import type { DoctorSummary } from '@/lib/consult/types';

export function initials(name: string) {
  return name.replace(/^dr\.?\s+/i, '').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DoctorAvatar({ doctor, size = 64 }: { doctor: Pick<DoctorSummary, 'displayName' | 'photoUrl'>; size?: number }) {
  const box = { width: size, height: size, borderRadius: Radius.xl };
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
        <Text style={styles.small}>
          {years}
          {doctor.languages.length > 0 ? ` · ${doctor.languages.join(', ')}` : ''}
        </Text>
        <Text style={styles.fee}>{formatRupees(doctor.consultationFee)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  avatar: { backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700', color: Colors.primary },
  body: { flex: 1, gap: 2 },
  name: { fontWeight: '700', fontSize: 16, color: Colors.foreground },
  specialty: { fontWeight: '600', color: Colors.primary },
  muted: { color: Colors.mutedForeground },
  small: { fontSize: 12, color: Colors.mutedForeground },
  fee: { marginTop: 4, fontWeight: '700', color: Colors.foreground },
});
