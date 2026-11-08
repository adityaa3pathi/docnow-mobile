import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, Type } from '@/constants/theme';
import type { ResultKind } from '@/lib/consult/bookingFlow';
import type { VerifyOutcome } from '@/lib/consult/types';
import { CONFIRMING_MESSAGE, HOLD_ENDED_MESSAGE, toneColors, VERIFY_MESSAGES, type Tone } from '@/lib/consult/status';

interface Props {
  result: ResultKind;
  /** True right after paying, so we celebrate. Later visits show a plain detail heading. */
  fresh: boolean;
  statusLabel: string;
  doctorId: string;
  /** What the payment check said, so a slot reclaimed by a late payment is explained. */
  verifyOutcome?: VerifyOutcome | null;
}

function copy(result: ResultKind, fresh: boolean, statusLabel: string, outcome?: VerifyOutcome | null): { title: string; body: string; tone: Tone } {
  switch (result) {
    case 'booked':
      if (!fresh) return { title: statusLabel, body: '', tone: 'success' };
      return outcome === 'reclaimed' || outcome === 'already' ? VERIFY_MESSAGES[outcome] : VERIFY_MESSAGES.confirmed;
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
export function PaymentStatus({ result, fresh, statusLabel, doctorId, verifyOutcome }: Props) {
  const heading = useRef<Text>(null);
  const { title, body, tone } = copy(result, fresh, statusLabel, verifyOutcome);
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
        <Pressable style={styles.action} onPress={() => router.replace('/consult/my')} accessibilityRole="button" accessibilityLabel="Done, go to My consultations">
          <Text style={[styles.link, { color: colors.fg }]}>Done</Text>
        </Pressable>
        {result === 'hold_ended' ? (
          <Pressable style={styles.action} onPress={() => router.replace({ pathname: '/consult/doctor/[id]', params: { id: doctorId } })} accessibilityRole="button" accessibilityLabel="Pick a new time">
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
  box: { padding: Space[4], borderRadius: Radius.lg, gap: Space[1] },
  title: { ...Type.titleSm },
  body: { ...Type.small },
  actions: { flexDirection: 'row', gap: Space[6] },
  action: { minHeight: 44, justifyContent: 'center' },
  link: { ...Type.bodyStrong, textDecorationLine: 'underline' },
});
