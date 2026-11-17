import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { nextFreeLabel } from '@/lib/consult/time';
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
  const next = doctor.nextSlotAt ? nextFreeLabel(doctor.nextSlotAt) : null;
  const nextText = next ? `next free ${next}` : doctor.nextSlotAt === null ? 'no open times right now' : '';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/consult/doctor/${doctor.id}`)}
      accessibilityRole="button"
      accessibilityLabel={[doctor.displayName, doctor.specialty.name, years, nextText, `fee ${formatRupees(doctor.consultationFee)} for ${doctor.slotMinutes} minutes`, 'Book now'].filter(Boolean).join(', ')}>
      {({ pressed }) => (
        <>
          <View style={styles.top}>
            <DoctorAvatar doctor={doctor} size={64} />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={2}>{doctor.displayName}</Text>
              <Text style={styles.specialty} numberOfLines={1}>{doctor.specialty.name}</Text>
              <Text style={styles.muted} numberOfLines={1}>{doctor.qualification}</Text>
              <Text style={[styles.muted, styles.facts]}>
                {years}
                {doctor.languages.length > 0 ? ` · ${doctor.languages.join(', ')}` : ''}
              </Text>
            </View>
          </View>
          {doctor.nextSlotAt !== undefined && (
            <View style={[styles.strip, next ? styles.stripOpen : styles.stripNone]}>
              <Text style={next ? styles.stripOpenText : styles.muted}>
                {next ? <>Next free <Text style={styles.strong}>{next}</Text></> : 'No open times right now'}
              </Text>
            </View>
          )}
          <View style={styles.footer}>
            <View style={styles.priceBox}>
              <Text style={styles.price}>{formatRupees(doctor.consultationFee)}</Text>
              <Text style={styles.muted}>{doctor.slotMinutes} min video call</Text>
            </View>
            {/* The whole card is the button; this is its visible call to action. */}
            <View style={[styles.cta, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaText}>Book now</Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  cardPressed: { borderColor: Colors.primary },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[4], padding: Space[4] },
  avatar: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: Fonts.semibold, color: Colors.primary },
  body: { flex: 1 },
  name: { ...Type.bodyLg, fontFamily: Fonts.bold, color: Colors.ink },
  specialty: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  muted: { ...Type.small, color: Colors.inkMuted },
  facts: { marginTop: Space[2] },
  strip: { marginHorizontal: Space[4], marginBottom: Space[4], paddingHorizontal: Space[3], paddingVertical: Space[2], borderRadius: Radius.md },
  stripOpen: { backgroundColor: Colors.successSoft },
  stripNone: { backgroundColor: Colors.surfaceSubtle },
  stripOpenText: { ...Type.small, color: Colors.successInk },
  strong: { fontFamily: Fonts.bold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingHorizontal: Space[4], paddingVertical: Space[3], borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  priceBox: { flexShrink: 1 },
  price: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  cta: { minHeight: 44, paddingHorizontal: Space[6], borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: Colors.primaryHover },
  ctaText: { ...Type.bodyStrong, fontFamily: Fonts.semibold, color: Colors.onPrimary },
});
