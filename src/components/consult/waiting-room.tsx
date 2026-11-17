import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Clock, Video } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui/progress-ring';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Colors, PrimaryGradient, Radius, Shadow, Type } from '@/constants/theme';
import { usePrecallNotes } from '@/hooks/use-precall-notes';
import { useTelemedicineConsent } from '@/hooks/use-telemedicine-consent';
import { useServerNow } from '@/hooks/use-server-now';
import { friendlyError } from '@/lib/consult/api';
import { CONSENT_REQUIRED_HINT, consentText } from '@/lib/consult/consent';
import { joinWindow } from '@/lib/consult/room';
import { formatIstTime } from '@/lib/consult/time';
import type { BookingView, JoinResponse } from '@/lib/consult/types';
import { CHECKLIST, countdownLabel, doctorDelay, timeLeft, waitingProgress } from '@/lib/consult/waitingRoom';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { DoctorDelayCard, type DelayOutcome } from './doctor-delay-card';
import { QuestionsNotepad } from './questions-notepad';
import { TechCheck } from './tech-check';
import { TelemedicineConsent } from './telemedicine-consent';

interface Props {
  booking: BookingView;
  /** Called only after the NMC consent box is ticked. */
  join: (consent: true) => Promise<JoinResponse>;
  onJoined: (res: JoinResponse) => void;
  /** The call is open over this screen: the camera preview must let go of the camera. */
  inCall: boolean;
  /** Join by itself once the room opens (from a "doctor is waiting" notification). */
  autoJoin?: boolean;
  onResolved: (outcome: DelayOutcome) => void;
}

function InRoomBadge({ name }: { name: string }) {
  return (
    <View style={styles.inRoom} testID="doctor-in-room" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <PulseDot color={Colors.success} size={12} />
      <Text style={styles.inRoomText}>Dr. {name} is in the room and ready for you</Text>
    </View>
  );
}

/** The late-doctor card over the video call, driven by live presence in the room. */
export function InCallDelay({ booking, doctorPresent, onResolved }: { booking: BookingView; doctorPresent: boolean; onResolved: (o: DelayOutcome) => void }) {
  const now = useServerNow(1_000);
  const delay = doctorDelay(booking, doctorPresent, now);
  return delay ? <DoctorDelayCard booking={booking} delay={delay} onResolved={onResolved} onDark /> : null;
}

/** Screen #13: shown from 15 minutes before the start until the call begins. */
export function WaitingRoom({ booking, join, onJoined, inCall, autoJoin = false, onResolved }: Props) {
  const now = useServerNow(1_000);
  const { notes, toggle } = usePrecallNotes(booking.consultationId);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const autoJoined = useRef(false);
  const [consented, setConsented] = useTelemedicineConsent(booking.consultationId);

  const win = joinWindow({ status: booking.status, startsAt: booking.startsAt, endsAt: booking.endsAt }, now);
  const doctorIn = !!booking.doctorJoined;
  const delay = doctorDelay(booking, doctorIn, now);

  async function start() {
    if (!consented) return;
    hapticImpact(ImpactFeedbackStyle.Medium);
    setJoining(true);
    setJoinError(null);
    try {
      onJoined(await join(true));
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setJoinError(friendlyError(e));
    } finally {
      setJoining(false);
    }
  }

  const autoStart = useEffectEvent(() => {
    autoJoined.current = true;
    void start();
  });
  const open = win.kind === 'open';
  // A "doctor is waiting" notification joins by itself only once consent was given; never around it.
  useEffect(() => {
    if (!autoJoin || !open || !consented || autoJoined.current) return;
    const t = setTimeout(autoStart, 0);
    return () => clearTimeout(t);
  }, [autoJoin, open, consented]);

  const done = notes.checked.length;
  const left = timeLeft(booking.startsAt, now);

  return (
    <View style={styles.wrap} testID="waiting-room">
      <LinearGradient colors={PrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, Shadow.raised]}>
        <Text style={styles.kicker}>Waiting room</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProgressRing progress={waitingProgress(booking.startsAt, now)} color="#fff" track="rgba(255, 255, 255, 0.2)">
            {left ? (
              <>
                <Text style={styles.ringTime}>{left}</Text>
                <Text style={styles.ringCaption}>min left</Text>
              </>
            ) : (
              <>
                <Video size={34} color="#fff" strokeWidth={2.2} />
                <Text style={styles.ringCaption}>Starting now</Text>
              </>
            )}
          </ProgressRing>
        </View>
        <Text style={styles.countdown} testID="waiting-countdown" accessibilityRole="timer">
          {countdownLabel(booking.startsAt, now)}
        </Text>
      </LinearGradient>

      <View style={[styles.doctorCard, Shadow.card]}>
        <View style={styles.doctorRow}>
          <View>
            {booking.doctorPhotoUrl ? (
              <Image source={{ uri: booking.doctorPhotoUrl }} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.photo, styles.initials]}>
                <Text style={styles.initialsText}>{booking.doctorName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.verified} accessibilityElementsHidden>
              <BadgeCheck size={18} color="#fff" fill={Colors.success} strokeWidth={2.4} />
            </View>
          </View>
          <View style={styles.flex}>
            <Text style={styles.doctorName}>Dr. {booking.doctorName}</Text>
            <Text style={styles.doctorSpecialty}>{[booking.doctorQualification, booking.specialty].filter(Boolean).join(' · ')}</Text>
            <View style={styles.timeRow}>
              <Clock size={13} color={Colors.mutedForeground} />
              <Text style={styles.doctorMeta}>
                {formatIstTime(booking.startsAt)} – {formatIstTime(booking.endsAt)} IST · for {booking.patientName}
              </Text>
            </View>
          </View>
        </View>
        {doctorIn ? <InRoomBadge name={booking.doctorName} /> : null}
      </View>

      {delay ? <DoctorDelayCard booking={booking} delay={delay} onResolved={onResolved} /> : null}

      <TelemedicineConsent checked={consented} onChange={setConsented} label={consentText(booking.doctorName)} />

      <Pressable
        testID="waiting-join"
        style={[styles.join, (!open || joining || !consented) && styles.dim]}
        disabled={!open || joining || !consented}
        onPress={() => void start()}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Join consultation' : 'Join consultation, not open yet'}
        accessibilityState={{ disabled: !open || joining || !consented, busy: joining }}>
        {joining ? (
          <ActivityIndicator color={Colors.primaryForeground} />
        ) : (
          <Text style={styles.joinText}>{open ? 'Join Consultation' : win.kind === 'early' ? `Room opens at ${formatIstTime(win.opensAt)}` : 'Join Consultation'}</Text>
        )}
      </Pressable>
      {open && !consented ? <Text style={styles.consentHint} testID="consent-required">{CONSENT_REQUIRED_HINT}</Text> : null}
      {joinError ? <Text style={styles.error} accessibilityRole="alert">{joinError}</Text> : null}

      <TechCheck paused={inCall} />

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle} accessibilityRole="header">Before you join</Text>
          <Text style={styles.progress}>{done}/{CHECKLIST.length}</Text>
        </View>
        {CHECKLIST.map((item) => {
          const on = notes.checked.includes(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`check-${item.id}`}
              style={styles.checkRow}
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Light);
                toggle(item.id);
              }}
              accessibilityRole="checkbox"
              aria-checked={on}
              accessibilityState={{ checked: on }}
              accessibilityLabel={item.label}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.tick}>✓</Text> : null}</View>
              <Text style={[styles.checkText, on && styles.checkTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <QuestionsNotepad consultationId={booking.consultationId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 18, borderRadius: Radius.xxl },
  kicker: { fontSize: Type.caption, fontWeight: '800', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: 1 },
  ringTime: { fontSize: 40, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  ringCaption: { fontSize: Type.caption, fontWeight: '700', color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
  countdown: { fontSize: Type.title, fontWeight: '700', color: Colors.primaryForeground, textAlign: 'center', fontVariant: ['tabular-nums'] },
  doctorCard: { gap: 14, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photo: { width: 84, height: 84, borderRadius: Radius.xl, backgroundColor: Colors.primaryTint },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 30, fontWeight: '800', color: Colors.primary },
  verified: { position: 'absolute', right: -4, bottom: -4, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.card, backgroundColor: Colors.success },
  doctorName: { fontSize: Type.headline, fontWeight: '800', color: Colors.foreground },
  doctorSpecialty: { fontSize: Type.body - 1, fontWeight: '600', color: Colors.primary, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  doctorMeta: { flex: 1, fontSize: Type.caption, color: Colors.mutedForeground },
  inRoom: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.successTint },
  inRoomText: { flex: 1, fontWeight: '800', color: '#166534' },
  join: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, backgroundColor: Colors.primary },
  joinText: { color: Colors.primaryForeground, fontWeight: '800', fontSize: 16 },
  dim: { opacity: 0.55 },
  error: { color: Colors.destructive, fontWeight: '600', fontSize: 13 },
  consentHint: { marginTop: -6, textAlign: 'center', fontSize: Type.caption, fontWeight: '600', color: Colors.mutedForeground },
  card: { gap: 10, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  progress: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.success, borderColor: Colors.success },
  tick: { color: Colors.primaryForeground, fontWeight: '900', fontSize: 14 },
  checkText: { flex: 1, fontSize: 14, color: Colors.foreground },
  checkTextOn: { color: Colors.mutedForeground, textDecorationLine: 'line-through' },
});
