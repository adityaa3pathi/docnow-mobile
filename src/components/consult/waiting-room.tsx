import { Image } from 'expo-image';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { usePrecallNotes } from '@/hooks/use-precall-notes';
import { useServerNow } from '@/hooks/use-server-now';
import { friendlyError } from '@/lib/consult/api';
import { joinWindow } from '@/lib/consult/room';
import { formatIstTime } from '@/lib/consult/time';
import type { BookingView, JoinResponse } from '@/lib/consult/types';
import { CHECKLIST, countdownLabel, doctorDelay } from '@/lib/consult/waitingRoom';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { DoctorDelayCard, type DelayOutcome } from './doctor-delay-card';
import { QuestionsNotepad } from './questions-notepad';
import { TechCheck } from './tech-check';

interface Props {
  booking: BookingView;
  join: () => Promise<JoinResponse>;
  onJoined: (res: JoinResponse) => void;
  /** The call is open over this screen: the camera preview must let go of the camera. */
  inCall: boolean;
  /** Join by itself once the room opens (from a "doctor is waiting" notification). */
  autoJoin?: boolean;
  onResolved: (outcome: DelayOutcome) => void;
}

function InRoomBadge({ name }: { name: string }) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.inRoom} testID="doctor-in-room" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Animated.View style={[styles.inRoomDot, { opacity: pulse }]} />
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

  const win = joinWindow({ status: booking.status, startsAt: booking.startsAt, endsAt: booking.endsAt }, now);
  const doctorIn = !!booking.doctorJoined;
  const delay = doctorDelay(booking, doctorIn, now);

  async function start() {
    hapticImpact(ImpactFeedbackStyle.Medium);
    setJoining(true);
    setJoinError(null);
    try {
      onJoined(await join());
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
  useEffect(() => {
    if (!autoJoin || !open || autoJoined.current) return;
    const t = setTimeout(autoStart, 0);
    return () => clearTimeout(t);
  }, [autoJoin, open]);

  const done = notes.checked.length;

  return (
    <View style={styles.wrap} testID="waiting-room">
      <View style={styles.hero}>
        <Text style={styles.countdown} testID="waiting-countdown" accessibilityRole="timer">
          {countdownLabel(booking.startsAt, now)}
        </Text>
        <View style={styles.doctorRow}>
          {booking.doctorPhotoUrl ? (
            <Image source={{ uri: booking.doctorPhotoUrl }} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.photo, styles.initials]}>
              <Text style={styles.initialsText}>{booking.doctorName.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.doctorName}>Dr. {booking.doctorName}</Text>
            <Text style={styles.doctorMeta}>{[booking.doctorQualification, booking.specialty].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.doctorMeta}>
              {formatIstTime(booking.startsAt)} – {formatIstTime(booking.endsAt)} IST · for {booking.patientName}
            </Text>
          </View>
        </View>
        {doctorIn ? <InRoomBadge name={booking.doctorName} /> : null}
      </View>

      {delay ? <DoctorDelayCard booking={booking} delay={delay} onResolved={onResolved} /> : null}

      <Pressable
        testID="waiting-join"
        style={[styles.join, (!open || joining) && styles.dim]}
        disabled={!open || joining}
        onPress={() => void start()}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Join consultation' : 'Join consultation, not open yet'}
        accessibilityState={{ disabled: !open || joining, busy: joining }}>
        {joining ? (
          <ActivityIndicator color={Colors.primaryForeground} />
        ) : (
          <Text style={styles.joinText}>{open ? 'Join Consultation' : win.kind === 'early' ? `Room opens at ${formatIstTime(win.opensAt)}` : 'Join Consultation'}</Text>
        )}
      </Pressable>
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
  hero: { gap: 14, padding: 18, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  countdown: { fontSize: 20, fontWeight: '800', color: Colors.primaryForeground, fontVariant: ['tabular-nums'] },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 56, height: 56, borderRadius: Radius.full, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 22, fontWeight: '800', color: Colors.primaryForeground },
  doctorName: { fontSize: 17, fontWeight: '800', color: Colors.primaryForeground },
  doctorMeta: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 },
  inRoom: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.successTint },
  inRoomDot: { width: 12, height: 12, borderRadius: Radius.full, backgroundColor: Colors.success },
  inRoomText: { flex: 1, fontWeight: '800', color: '#166534' },
  join: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, backgroundColor: Colors.primary },
  joinText: { color: Colors.primaryForeground, fontWeight: '800', fontSize: 16 },
  dim: { opacity: 0.55 },
  error: { color: Colors.destructive, fontWeight: '600', fontSize: 13 },
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
