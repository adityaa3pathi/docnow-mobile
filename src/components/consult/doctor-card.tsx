import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, Briefcase, Languages, Video } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadow, Type } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import type { DoctorSummary } from '@/lib/consult/types';

export function initials(name: string) {
  return name.replace(/^dr\.?\s+/i, '').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DoctorAvatar({ doctor, size = 64 }: { doctor: Pick<DoctorSummary, 'displayName' | 'photoUrl'>; size?: number }) {
  const box = { width: size, height: size, borderRadius: Radius.xl };
  if (doctor.photoUrl) return <Image source={{ uri: doctor.photoUrl }} style={box} contentFit="cover" accessibilityElementsHidden />;
  return (
    <View style={[styles.avatar, box]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.initials, { fontSize: size / 3 }]}>{initials(doctor.displayName)}</Text>
    </View>
  );
}

/**
 * Doctor discovery card. Every doctor listed is admin-approved with a checked medical registration,
 * which is what the "Verified" mark stands for. No ratings or availability claims: we have no such data.
 */
export function DoctorCard({ doctor }: { doctor: DoctorSummary }) {
  const years = `${doctor.experienceYears} ${doctor.experienceYears === 1 ? 'year' : 'years'} experience`;
  const open = () => router.push(`/consult/doctor/${doctor.id}`);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${doctor.displayName}, ${doctor.specialty.name}, ${years}, fee ${formatRupees(doctor.consultationFee)}`}>
      <View style={styles.top}>
        <View>
          <DoctorAvatar doctor={doctor} size={72} />
          <View style={styles.verifiedDot} accessibilityElementsHidden>
            <BadgeCheck size={18} color={Colors.primaryForeground} fill={Colors.success} strokeWidth={2.4} />
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{doctor.displayName}</Text>
          <Text style={styles.specialty} numberOfLines={1}>{doctor.specialty.name}</Text>
          <Text style={styles.muted} numberOfLines={1}>{doctor.qualification}</Text>
          <View style={styles.pills}>
            <View style={styles.expPill}>
              <Briefcase size={12} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.expText}>{doctor.experienceYears} yrs exp</Text>
            </View>
            <View style={styles.verifiedPill}>
              <BadgeCheck size={12} color={Colors.success} strokeWidth={2.4} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          {doctor.languages.length > 0 ? (
            <View style={styles.langRow}>
              <Languages size={13} color={Colors.mutedForeground} />
              <Text style={styles.small} numberOfLines={1}>{doctor.languages.join(', ')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.fee}>{formatRupees(doctor.consultationFee)}</Text>
          <Text style={styles.small}>{doctor.slotMinutes} min video consult</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`Book a slot with ${doctor.displayName}`}>
          <Video size={16} color={Colors.primaryForeground} strokeWidth={2.4} />
          <Text style={styles.ctaText}>Book Slot</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  top: { flexDirection: 'row', gap: 14 },
  avatar: { backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800', color: Colors.primary },
  verifiedDot: { position: 'absolute', right: -4, bottom: -4, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.card, backgroundColor: Colors.success },
  body: { flex: 1, gap: 3 },
  name: { fontWeight: '800', fontSize: Type.title + 1, color: Colors.foreground },
  specialty: { fontWeight: '700', fontSize: Type.body, color: Colors.primary },
  muted: { fontSize: Type.caption + 1, color: Colors.mutedForeground },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  expPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.primaryTint },
  expText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.successTint },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  small: { flexShrink: 1, fontSize: Type.caption, color: Colors.mutedForeground },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  fee: { fontSize: Type.headline - 2, fontWeight: '800', color: Colors.foreground },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 18, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  ctaPressed: { backgroundColor: Colors.primaryDark },
  ctaText: { color: Colors.primaryForeground, fontWeight: '800', fontSize: Type.body },
});
