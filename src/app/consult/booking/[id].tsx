import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookingSummary } from '@/components/consult/booking-summary';
import { CancelSheet } from '@/components/consult/cancel-sheet';
import { JoinPanel } from '@/components/consult/join-panel';
import { PatientPrescription } from '@/components/consult/patient-prescription';
import { CheckingNotice, ConfirmingNotice, PaymentStatus } from '@/components/consult/payment-status';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton } from '@/components/doctor/ui';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { loadActiveBooking } from '@/lib/consult/store';
import { useBookingFlow } from '@/hooks/use-booking-flow';
import { consult } from '@/lib/consult/api';
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
    if (!autoPay || autoOpened.current || decision?.kind !== 'pay' || flow.payStillLanding) return;
    autoOpened.current = true;
    // Any app or page can open docnow://…?pay=1, so only the booking created here may auto-open checkout.
    void loadActiveBooking().then((saved) => {
      if (saved?.id === id) void pay();
    });
  }, [autoPay, decision?.kind, pay, flow.payStillLanding, id]);

  // My consultations must not show "Continue to pay" for a booking that just confirmed.
  const settled = decision?.kind === 'result' ? decision.result : null;
  useEffect(() => {
    if (settled) void queryClient.invalidateQueries({ queryKey: ['consult', 'bookings'] });
  }, [settled, queryClient]);

  // A second payment while the first may still land charges the patient twice (refunded later).
  const onPayPress = () => {
    if (!flow.payStillLanding) return void pay();
    Alert.alert(
      'Pay again?',
      'You opened a payment a few minutes ago. If you paid in your UPI app, it can take a few minutes to show here. Paying again may charge you twice.',
      [
        { text: 'Wait', style: 'cancel' },
        { text: 'Pay again', style: 'destructive', onPress: () => void pay() },
      ],
    );
  };

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
  // The server sends ₹0 and refuses cancels for these; showing either would mislead.
  const forYou = !!booking.isBookedForYou;
  const summary = (
    <BookingSummary
      doctorName={booking.doctorName}
      specialty={booking.specialty}
      startsAt={booking.startsAt}
      endsAt={booking.endsAt}
      personName={booking.patientName}
      amount={forYou ? `Paid by ${booking.bookedBy?.name ?? 'your family member'}` : formatPaise(booking.amountPaise)}
      amountLabel={forYou ? 'Payment' : 'Amount'}
    />
  );

  const canCancel = info.canCancel && !forYou && decision.kind !== 'poll' && !booking.underStaffCheck && !paidButUnsettled;

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
          {flow.payStillLanding ? (
            <Text style={styles.note} accessibilityLiveRegion="polite">
              {`You opened a payment ${flow.minutesSinceCheckout ? `${flow.minutesSinceCheckout} min` : 'moments'} ago. If you paid in your UPI app, we are checking and this updates by itself. Please wait before paying again.`}
            </Text>
          ) : null}
          <ActionButton
            label={`Pay ${formatPaise(booking.amountPaise)}`}
            busyLabel="Opening payment"
            busy={flow.opening}
            onPress={onPayPress}
          />
        </>
      )}
      {decision.kind === 'poll' && (
        <>
          {booking.paymentCaptured || flow.paidHere ? <ConfirmingNotice /> : <CheckingNotice />}
          {/* The last good answer stays on screen, so a dead connection must be said out loud. */}
          {flow.error ? (
            <Text style={styles.note} accessibilityRole="alert">{`We cannot reach DocNow right now (${flow.error.message}). We will keep checking.`}</Text>
          ) : null}
          {summary}
          <View style={[styles.button, styles.disabled]} accessibilityRole="button" accessibilityLabel="Pay, not available right now" accessibilityState={{ disabled: true }}>
            <Text style={styles.buttonText}>Pay</Text>
          </View>
        </>
      )}
      {decision.kind === 'result' && (
        <>
          <PaymentStatus result={decision.result} fresh={fresh} statusLabel={info.label} doctorId={booking.doctorId} verifyOutcome={flow.verifyOutcome} />
          {summary}
          {forYou ? null : <RefundLine booking={booking} />}
          <JoinPanel
            status={booking.status}
            type={booking.type}
            startsAt={booking.startsAt}
            endsAt={booking.endsAt}
            otherParty="doctor"
            consentDoctorName={booking.doctorName}
            join={() => consult.join(booking.consultationId)}
            onChange={() => void flow.refetch()}
          />
          {booking.hasPrescription ? (
            <PatientPrescription bookingId={booking.consultationId} />
          ) : booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED' ? (
            <View style={styles.waitingRx}>
              <Text style={styles.waitingRxText}>Your prescription will show here once the doctor issues it.</Text>
              <Pressable onPress={() => void flow.refetch()} accessibilityRole="button" accessibilityLabel="Check again" style={styles.checkAgain}>
                <Text style={styles.linkText}>Check again</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
      {canCancel && (
        <ActionButton
          label={booking.status === 'PENDING_PAYMENT' ? 'Cancel this booking' : 'Cancel consultation'}
          variant="soft"
          onPress={() => setCancelOpen(true)}
        />
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
  flex: { flex: 1, backgroundColor: Colors.surface },
  pad: { padding: Space[4] },
  content: { padding: Space[4], gap: Space[4] },
  h1: { ...Type.title, color: Colors.ink },
  timer: { alignItems: 'center', gap: Space[1], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.primarySoft },
  small: { ...Type.small, color: Colors.inkMuted },
  count: { ...Type.titleLg, color: Colors.primary, fontVariant: ['tabular-nums'] },
  hidden: { height: 0, opacity: 0 },
  note: { ...Type.small, padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.warningSoft, color: Colors.warningInk },
  refund: { ...Type.small, padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.infoSoft, color: Colors.infoInk },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonText: { ...Type.bodyStrong, color: Colors.onPrimary },
  disabled: { opacity: 0.5 },
  linkText: { ...Type.bodyStrong, color: Colors.primary },
  waitingRx: { gap: Space[2], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  waitingRxText: { ...Type.small, color: Colors.inkMuted },
  checkAgain: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
