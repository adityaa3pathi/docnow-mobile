import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallRoomView } from '@/components/consult/call-room-view';
import { TelemedicineConsent } from '@/components/consult/telemedicine-consent';
import { Colors, Radius } from '@/constants/theme';
import { consult, errorStatus, friendlyError } from '@/lib/consult/api';
import { GUEST_CONSENT_REQUIRED_HINT, GUEST_CONSENT_TEXT } from '@/lib/consult/consent';
import { guestCopy } from '@/lib/consult/family';
import { formatIstDateTime, formatIstTime } from '@/lib/consult/time';
import type { GuestInfo, JoinResponse } from '@/lib/consult/types';
import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';

const POLL_MS = 15_000;

/**
 * Target of docnow.in/call/<token> (and docnow://consult/guest/<token>) when the app is installed:
 * the family member joins as the patient without signing in. Large text, Hindi and English.
 */
export default function GuestCallScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<GuestInfo | null>(null);
  const [problem, setProblem] = useState<{ gone: boolean; message: string } | null>(null);
  const [lang, setLang] = useState<'hi' | 'en' | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [call, setCall] = useState<JoinResponse | null>(null);
  const [consented, setConsented] = useState(false);
  const announced = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await consult.guestInfo(token);
      if (next.doctorJoined && !announced.current) {
        announced.current = true;
        hapticNotify(NotificationFeedbackType.Warning);
      }
      setInfo(next);
      setProblem(null);
    } catch (e) {
      setProblem({ gone: errorStatus(e) === 410, message: friendlyError(e, 'We could not open this consultation.') });
    }
  }, [token]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function start() {
    if (!consented) return;
    setJoining(true);
    setJoinError(null);
    try {
      setCall(await consult.guestJoin(token, true));
    } catch (e) {
      setJoinError(friendlyError(e, 'We could not start the call. Please check your internet and try again.'));
      void load();
    } finally {
      setJoining(false);
    }
  }

  if (problem && !info) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 24 }]} testID="guest-problem">
        <Text style={styles.h1}>{problem.gone ? 'यह लिंक अब काम नहीं करता' : 'यह लिंक सही नहीं है'}</Text>
        <Text style={styles.body}>{problem.message}</Text>
        <Pressable style={styles.secondary} onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={styles.secondaryText}>Open DocNow</Text>
        </Pressable>
      </View>
    );
  }
  if (!info) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.body}>कृपया प्रतीक्षा करें… / Please wait…</Text>
      </View>
    );
  }

  const copy = guestCopy({ ...info, language: lang ?? info.language });
  const open = info.window === 'open';
  const dr = info.doctor.name.startsWith('Dr') ? info.doctor.name : `Dr. ${info.doctor.name}`;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} testID="guest-room">
      <View style={styles.topRow}>
        <Text style={styles.brand}>DocNow</Text>
        <Pressable
          style={styles.langBtn}
          onPress={() => setLang((lang ?? info.language) === 'hi' ? 'en' : 'hi')}
          accessibilityRole="button"
          accessibilityLabel={(lang ?? info.language) === 'hi' ? 'Switch to English' : 'हिन्दी में देखें'}>
          <Text style={styles.langText}>{(lang ?? info.language) === 'hi' ? 'English' : 'हिन्दी'}</Text>
        </Pressable>
      </View>

      <Text style={styles.h1} accessibilityRole="header">{info.doctorJoined ? copy.primary.greeting : copy.primary.waiting}</Text>
      <Text style={styles.sub}>{info.doctorJoined ? copy.secondary.greeting : copy.secondary.waiting}</Text>

      <View style={styles.doctorCard}>
        {info.doctor.photoUrl ? (
          <Image source={{ uri: info.doctor.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.initials]}>
            <Text style={styles.initialsText}>🩺</Text>
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.doctorName}>{dr}</Text>
          <Text style={styles.doctorMeta}>{info.doctor.qualification} · {info.doctor.specialty}</Text>
          <Text style={styles.doctorWhen}>{formatIstDateTime(info.startsAt)}</Text>
        </View>
      </View>

      {info.doctorJoined ? (
        <View style={styles.inRoom} accessibilityRole="alert" testID="guest-doctor-in">
          <View style={styles.dot} />
          <Text style={styles.inRoomText}>{copy.primary.doctorIn}</Text>
        </View>
      ) : null}

      <TelemedicineConsent checked={consented} onChange={setConsented} label={GUEST_CONSENT_TEXT} senior language={lang ?? info.language} />

      <Pressable
        testID="guest-start"
        style={[styles.start, (!open || joining || !consented) && styles.dim]}
        disabled={!open || joining || !consented}
        onPress={() => void start()}
        accessibilityRole="button"
        accessibilityLabel={`${copy.primary.start} (${copy.secondary.start})`}>
        {joining ? (
          <ActivityIndicator color={Colors.primaryForeground} />
        ) : (
          <Text style={styles.startText}>📞 {copy.primary.start} ({copy.secondary.start})</Text>
        )}
      </Pressable>
      {open && !consented ? <Text style={styles.body}>{GUEST_CONSENT_REQUIRED_HINT}</Text> : null}
      {!open ? <Text style={styles.body}>{copy.primary.early} · {formatIstTime(info.opensAt)}</Text> : null}
      {joinError ? <Text style={styles.error} accessibilityRole="alert">{joinError}</Text> : null}
      <Text style={styles.body}>{copy.primary.allow}</Text>
      <Text style={styles.sub}>{copy.secondary.allow}</Text>

      <CallRoomView
        visible={call !== null}
        url={call?.url ?? ''}
        token={call?.token ?? ''}
        role={call?.role ?? 'patient'}
        otherPartyName={dr}
        onLeave={() => {
          setCall(null);
          void load();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.card },
  content: { gap: 16, paddingHorizontal: 20 },
  center: { flex: 1, gap: 16, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.border },
  langText: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  h1: { fontSize: 26, fontWeight: '900', color: '#0B0B12', lineHeight: 34 },
  sub: { fontSize: 18, color: '#3F3F46', lineHeight: 25 },
  body: { fontSize: 18, color: '#18181B', lineHeight: 26, textAlign: 'center' },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.xxl, borderWidth: 2, borderColor: Colors.border },
  photo: { width: 76, height: 76, borderRadius: Radius.full, backgroundColor: Colors.primary },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 32 },
  doctorName: { fontSize: 21, fontWeight: '800', color: '#0B0B12' },
  doctorMeta: { fontSize: 16, color: '#3F3F46' },
  doctorWhen: { fontSize: 16, fontWeight: '700', color: '#0B0B12', marginTop: 2 },
  inRoom: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.xl, backgroundColor: Colors.successTint },
  dot: { width: 14, height: 14, borderRadius: Radius.full, backgroundColor: Colors.success },
  inRoomText: { flex: 1, fontSize: 19, fontWeight: '800', color: '#14532D' },
  start: { minHeight: 76, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.xxl, backgroundColor: Colors.primary },
  startText: { fontSize: 22, fontWeight: '900', color: Colors.primaryForeground, textAlign: 'center' },
  dim: { opacity: 0.5 },
  error: { fontSize: 17, fontWeight: '700', color: Colors.destructive, textAlign: 'center' },
  secondary: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 2, borderColor: Colors.primary },
  secondaryText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
});
