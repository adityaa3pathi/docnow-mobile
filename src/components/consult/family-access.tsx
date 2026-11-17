import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useServerNow } from '@/hooks/use-server-now';
import { consult, friendlyError } from '@/lib/consult/api';
import { bookedForYouLabel } from '@/lib/consult/family';
import { joinWindow } from '@/lib/consult/room';
import { formatIstDateTime } from '@/lib/consult/time';
import type { BookingView } from '@/lib/consult/types';
import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';

/** The caregiver forwards the zero-install web room link through their own WhatsApp, SMS, etc. */
export function shareCallLink(booking: Pick<BookingView, 'doctorName' | 'guestJoinUrl'>) {
  if (!booking.guestJoinUrl) return Promise.resolve(null);
  const dr = booking.doctorName.startsWith('Dr') ? booking.doctorName : `Dr. ${booking.doctorName}`;
  // `url` is used by iOS share targets; Android reads the link from the message.
  return Share.share({ message: `Namaste! ${dr} consultation link: ${booking.guestJoinUrl}`, url: booking.guestJoinUrl });
}

export function ShareCallLinkButton({ booking }: { booking: Pick<BookingView, 'doctorName' | 'guestJoinUrl' | 'patientName'> }) {
  if (!booking.guestJoinUrl) return null;
  const first = booking.patientName.trim().split(/\s+/)[0] || booking.patientName;
  return (
    <Pressable
      testID="share-call-link"
      style={({ pressed }) => [styles.share, pressed && styles.dim]}
      onPress={() => void shareCallLink(booking).catch(() => {})}
      accessibilityRole="button"
      accessibilityHint="Opens your phone's share sheet">
      <Text style={styles.shareText}>🔗 Share Call Link with {first}</Text>
    </Pressable>
  );
}

/** Purple "Booked for you by Aditya" badge on consultation cards and pages. */
export function BookedForYouBadge({ booking }: { booking: BookingView }) {
  const { title } = bookedForYouLabel(booking);
  return (
    <View style={styles.badge} testID="booked-for-you-badge" accessibilityLabel={title}>
      <Text style={styles.badgeText}>👪 {title}</Text>
    </View>
  );
}

/**
 * The family member's one-time "is this you?". Until they accept, the booking shows only doctor and
 * time; afterwards it shows in full (and so do later bookings for them). "Not me" hides it for good
 * and tells the booker the number may be wrong.
 */
export function FamilyAcceptCard({ booking, onDone }: { booking: BookingView; onDone: (accepted: boolean) => void }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { title, detail } = bookedForYouLabel(booking);

  async function answer(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline');
    setError(null);
    try {
      if (accept) await consult.acceptFamily(booking.patientId);
      else await consult.declineFamily(booking.patientId);
      hapticNotify(accept ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning);
      void queryClient.invalidateQueries({ queryKey: ['consult', 'bookings'] });
      onDone(accept);
    } catch (e) {
      setError(friendlyError(e, 'We could not save your answer. Please try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.card} testID="family-accept">
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.body}>
        A video consultation with Dr. {booking.doctorName} on {formatIstDateTime(booking.startsAt)} (Indian time), for {booking.patientName}.
      </Text>
      {detail ? <Text style={styles.muted}>{detail}.</Text> : null}
      <Text style={styles.body}>Is this you? Once you confirm, you can join the call and see the prescription here.</Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <View style={styles.row}>
        <Pressable
          testID="family-accept-yes"
          style={[styles.primary, busy !== null && styles.dim]}
          disabled={busy !== null}
          onPress={() => void answer(true)}
          accessibilityRole="button">
          {busy === 'accept' ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Yes, it&apos;s me</Text>}
        </Pressable>
        <Pressable
          testID="family-accept-no"
          style={[styles.secondary, busy !== null && styles.dim]}
          disabled={busy !== null}
          onPress={() => void answer(false)}
          accessibilityRole="button">
          {busy === 'decline' ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryText}>Not me</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const UPCOMING = ['CONFIRMED', 'WAITING', 'IN_PROGRESS'];

/** Home: the next consultation a family member booked for you, with one big Join Call. */
export function BookedForYouBanner() {
  const now = useServerNow(30_000);
  const { data } = useQuery({ queryKey: ['consult', 'bookings'], queryFn: consult.bookings, staleTime: 30_000 });
  const next = (data ?? [])
    .filter((b) => b.isBookedForYou && UPCOMING.includes(b.status) && Date.parse(b.endsAt) > now - 15 * 60_000)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (!next) return null;

  const pending = next.familyAccess === 'pending';
  const open = !pending && joinWindow({ status: next.status, startsAt: next.startsAt, endsAt: next.endsAt }, now).kind === 'open';
  return (
    <View style={styles.banner} testID="booked-for-you-banner">
      <Text style={styles.bannerKicker}>Doctor Consultation · {bookedForYouLabel(next).title}</Text>
      <Text style={styles.bannerTitle}>Dr. {next.doctorName}</Text>
      <Text style={styles.bannerSub}>{formatIstDateTime(next.startsAt)} (Indian time)</Text>
      <Pressable
        testID="booked-for-you-join"
        style={styles.bannerBtn}
        onPress={() => router.push({ pathname: '/consult/booking/[id]', params: open ? { id: next.consultationId, join: '1' } : { id: next.consultationId } })}
        accessibilityRole="button">
        <Text style={styles.bannerBtnText}>{pending ? 'Confirm it’s you' : open ? 'Join Call' : 'View consultation'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.primarySubtle },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  card: { gap: 10, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primarySubtle, backgroundColor: Colors.primaryTint },
  title: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  body: { fontSize: 14, color: Colors.foreground, lineHeight: 20 },
  muted: { fontSize: 12, color: Colors.mutedForeground },
  error: { color: Colors.destructive, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primary },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondary: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary },
  secondaryText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  dim: { opacity: 0.6 },
  share: { minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.card },
  shareText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  banner: { gap: 4, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primary, marginHorizontal: 16, marginTop: 12 },
  bannerKicker: { fontSize: 12, fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: Colors.primaryForeground },
  bannerSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)' },
  bannerBtn: { marginTop: 10, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primaryForeground },
  bannerBtnText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
