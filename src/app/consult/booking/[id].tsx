import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingSummary } from '@/components/consult/booking-summary';
import { CancelSheet } from '@/components/consult/cancel-sheet';
import { CheckingNotice, ConfirmingNotice, PaymentStatus } from '@/components/consult/payment-status';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { useBookingFlow } from '@/hooks/use-booking-flow';
import { formatCountdown } from '@/lib/consult/bookingFlow';
import { formatPaise } from '@/lib/consult/format';
import { statusInfo } from '@/lib/consult/status';
import type { BookingView } from '@/lib/consult/types';

const REFUND_TEXT = {
  PENDING: 'Refund on its way',
  PROCESSED: 'Refund sent to your original payment method',
  FAILED: 'Refund needs a manual step. Our team has been told.',
} as const;

function RefundLine({ booking }: { booking: BookingView }) {
  if (booking.refundPaise <= 0) return null;
  const text = `${formatPaise(booking.refundPaise)}: ${booking.refundStatus ? REFUND_TEXT[booking.refundStatus] : 'Refund being prepared'}`;
  return (
    <Text style={styles.refund} accessibilityLabel={text}>{text}</Text>
  );
}

export default function BookingScreen() {
  const { id, pay: payParam } = useLocalSearchParams<{ id: string; pay?: string }>();
  const autoPay = payParam === '1';
  const flow = useBookingFlow(id, true);
  const autoOpened = useRef(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const queryClient = useQueryClient();
  const { booking, decision, pay } = flow;

  // Opens checkout once, right after the booking is created.
  useEffect(() => {
    if (autoPay && !autoOpened.current && decision?.kind === 'pay') {
      autoOpened.current = true;
      void pay();
    }
  }, [autoPay, decision?.kind, pay]);

  const busyPaying = flow.opening || decision?.kind === 'poll';
  // Back stays on this screen while checkout is open or a payment check is running.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => busyPaying);
    return () => sub.remove();
  }, [busyPaying]);

  const options = <Stack.Screen options={{ headerBackVisible: !busyPaying, gestureEnabled: !busyPaying }} />;

  if (flow.loading && !booking) return <LoadingBlock label="Loading booking" />;
  if (!booking || !decision) {
    return (
      <View style={styles.pad}>
        {options}
        <ErrorState message={flow.error?.message ?? 'We could not load this booking.'} onRetry={() => void flow.refetch()} />
      </View>
    );
  }

  const info = statusInfo(booking.status);
  const fresh = autoPay || flow.paidHere;
  const paidButUnsettled = booking.status === 'PENDING_PAYMENT' && (booking.paymentCaptured || flow.paidHere);
  const summary = (
    <BookingSummary
      doctorName={booking.doctorName}
      specialty={booking.specialty}
      startsAt={booking.startsAt}
      endsAt={booking.endsAt}
      personName={booking.patientName}
      amount={formatPaise(booking.amountPaise)}
      amountLabel="Amount"
    />
  );

  const canCancel = info.canCancel && decision.kind !== 'poll' && !booking.underStaffCheck && !paidButUnsettled;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {options}
      {decision.kind === 'pay' && (
        <>
          <Text style={styles.h1} accessibilityRole="header">Complete your payment</Text>
          <View style={styles.timer} accessible accessibilityLabel={`Your time is held for ${formatCountdown(flow.secondsLeft)}`}>
            <Text style={styles.small}>Your time is held for</Text>
            <Text style={styles.count} importantForAccessibility="no">{formatCountdown(flow.secondsLeft)}</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.hidden}>{flow.announcement}</Text>
          {summary}
          {flow.payNote ? <Text style={styles.note} accessibilityRole="alert">{flow.payNote}</Text> : null}
          <Pressable
            style={[styles.button, flow.opening && styles.disabled]}
            disabled={flow.opening}
            onPress={() => void pay()}
            accessibilityRole="button"
            accessibilityLabel={flow.opening ? 'Opening payment' : `Pay ${formatPaise(booking.amountPaise)}`}
            accessibilityState={{ disabled: flow.opening, busy: flow.opening }}>
            {flow.opening ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.buttonText}>Pay {formatPaise(booking.amountPaise)}</Text>}
          </Pressable>
        </>
      )}
      {decision.kind === 'poll' && (
        <>
          {paidButUnsettled || booking.paymentCaptured || flow.paidHere ? <ConfirmingNotice /> : <CheckingNotice />}
          {summary}
          <View style={[styles.button, styles.disabled]} accessibilityRole="button" accessibilityLabel="Pay, not available right now" accessibilityState={{ disabled: true }}>
            <Text style={styles.buttonText}>Pay</Text>
          </View>
        </>
      )}
      {decision.kind === 'result' && (
        <>
          <PaymentStatus result={decision.result} fresh={fresh} statusLabel={info.label} doctorId={booking.doctorId} />
          {summary}
          <RefundLine booking={booking} />
        </>
      )}
      {canCancel && (
        <Pressable
          style={styles.outline}
          onPress={() => setCancelOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={booking.status === 'PENDING_PAYMENT' ? 'Cancel this booking' : 'Cancel consultation'}>
          <Text style={styles.outlineText}>{booking.status === 'PENDING_PAYMENT' ? 'Cancel this booking' : 'Cancel consultation'}</Text>
        </Pressable>
      )}
      <CancelSheet
        visible={cancelOpen}
        bookingId={booking.consultationId}
        unpaid={booking.status === 'PENDING_PAYMENT'}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          void flow.refetch();
          void queryClient.invalidateQueries({ queryKey: ['consult', 'bookings'] });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 16 },
  h1: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  timer: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primaryTint },
  small: { fontSize: 12, color: Colors.mutedForeground },
  count: { fontSize: 32, fontWeight: '900', color: Colors.primary },
  hidden: { height: 0, opacity: 0 },
  note: { padding: 14, borderRadius: Radius.lg, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' },
  refund: { padding: 14, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint, fontWeight: '600', color: Colors.foreground },
  button: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  buttonText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  outline: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primary },
  outlineText: { color: Colors.primary, fontWeight: '700' },
});
