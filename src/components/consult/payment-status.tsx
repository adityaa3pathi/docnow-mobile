import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import type { ResultKind } from '@/lib/consult/bookingFlow';
import { CONFIRMING_MESSAGE, HOLD_ENDED_MESSAGE, toneColors, VERIFY_MESSAGES, type Tone } from '@/lib/consult/status';

interface Props {
  result: ResultKind;
  /** True right after paying, so we celebrate. Later visits show a plain detail heading. */
  fresh: boolean;
  statusLabel: string;
  doctorId: string;
}

function copy(result: ResultKind, fresh: boolean, statusLabel: string): { title: string; body: string; tone: Tone } {
  switch (result) {
    case 'booked':
      return fresh ? VERIFY_MESSAGES.confirmed : { title: statusLabel, body: '', tone: 'success' };
    case 'refund':
      return VERIFY_MESSAGES.refund_created;
    case 'checking':
      return VERIFY_MESSAGES.flagged;
    case 'hold_ended':
      return { title: 'This hold ended', body: HOLD_ENDED_MESSAGE, tone: 'muted' };
    case 'still_confirming':
      return { title: 'We are still confirming your payment', body: 'This is taking longer than usual. Please do not pay again. It will show in My consultations once confirmed.', tone: 'warning' };
    default:
      return { title: statusLabel, body: '', tone: 'muted' };
  }
}

/** One message per outcome, announced to screen readers. Done goes to My consultations. */
export function PaymentStatus({ result, fresh, statusLabel, doctorId }: Props) {
  const heading = useRef<Text>(null);
  const { title, body, tone } = copy(result, fresh, statusLabel);
  const colors = toneColors[tone];

  useEffect(() => {
    const node = heading.current ? findNodeHandle(heading.current) : null;
    if (fresh && node) AccessibilityInfo.setAccessibilityFocus(node);
  }, [result, fresh]);

  return (
    <View style={[styles.box, { backgroundColor: colors.bg }]} accessibilityLiveRegion="polite">
      <Text ref={heading} style={[styles.title, { color: colors.fg }]} accessibilityRole="header">{title}</Text>
      {body ? <Text style={[styles.body, { color: colors.fg }]}>{body}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={() => router.replace('/consult/my')} accessibilityRole="button" accessibilityLabel="Done, go to My consultations">
          <Text style={[styles.link, { color: colors.fg }]}>Done</Text>
        </Pressable>
        {result === 'hold_ended' ? (
          <Pressable onPress={() => router.replace({ pathname: '/consult/doctor/[id]', params: { id: doctorId } })} accessibilityRole="button" accessibilityLabel="Pick a new time">
            <Text style={[styles.link, { color: colors.fg }]}>Pick a new time</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ConfirmingNotice() {
  return (
    <View style={[styles.box, { backgroundColor: toneColors.warning.bg }]} accessibilityLiveRegion="polite" accessible accessibilityLabel={`${CONFIRMING_MESSAGE} This usually takes a few seconds.`}>
      <Text style={[styles.title, { color: toneColors.warning.fg }]}>{CONFIRMING_MESSAGE}</Text>
      <Text style={[styles.body, { color: toneColors.warning.fg }]}>This usually takes a few seconds.</Text>
    </View>
  );
}

export function CheckingNotice() {
  return (
    <View style={[styles.box, { backgroundColor: toneColors.muted.bg }]} accessibilityLiveRegion="polite" accessible accessibilityLabel="Checking your booking. The payment window has ended. We are making sure no payment is on the way.">
      <Text style={[styles.title, { color: toneColors.muted.fg }]}>Checking your booking</Text>
      <Text style={[styles.body, { color: toneColors.muted.fg }]}>The payment window has ended. We are making sure no payment is on the way.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, borderRadius: Radius.xl, gap: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});
