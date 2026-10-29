import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { formatPaise } from '@/lib/consult/format';
import { formatIstTime, groupSlotsByDay } from '@/lib/consult/time';
import type { BookingView, CancelResult, ReassignOption, Slot } from '@/lib/consult/types';
import { formatMmSs, refundEta, type DoctorDelay } from '@/lib/consult/waitingRoom';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';

export type DelayOutcome = 'rescheduled' | 'reassigned' | 'refunded';

interface Props {
  booking: BookingView;
  delay: DoctorDelay;
  /** After a reschedule, a new doctor or a refund: the screen reloads the booking (and leaves the call). */
  onResolved: (outcome: DelayOutcome) => void;
  /** Dark styling for use over the video call. */
  onDark?: boolean;
}

type Step =
  | { kind: 'options' }
  | { kind: 'waiting' }
  | { kind: 'reassign-loading' }
  | { kind: 'reassign'; option: ReassignOption | null }
  | { kind: 'refund-confirm' }
  | { kind: 'refunded'; result: CancelResult };

function RescheduleSheet({ booking, visible, onClose, onDone }: { booking: BookingView; visible: boolean; onClose: () => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['consult', 'reschedule-slots', booking.consultationId],
    queryFn: () => consult.rescheduleSlots(booking.consultationId),
    enabled: visible,
    staleTime: 0,
    retry: false,
  });
  const slots: Slot[] | undefined = query.data;
  const loadError = query.error ? friendlyError(query.error, 'We could not load free times.') : null;

  async function confirm() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await consult.reschedule(booking.consultationId, picked);
      hapticNotify(NotificationFeedbackType.Success);
      onDone();
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setError(friendlyError(e, 'We could not move your consultation.'));
      // The slot may have just been taken: show the current free times again.
      setPicked(null);
      void query.refetch();
    } finally {
      setBusy(false);
    }
  }

  const days = slots ? groupSlotsByDay(slots) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} testID="reschedule-sheet">
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle} accessibilityRole="header">Pick a new time with Dr. {booking.doctorName}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetSub}>No extra charge. Times are in Indian time.</Text>

          {loadError ? (
            <View style={styles.inlineError}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable onPress={() => void query.refetch()} accessibilityRole="button">
                <Text style={styles.link}>Try again</Text>
              </Pressable>
            </View>
          ) : !slots ? (
            <ActivityIndicator color={Colors.primary} style={styles.spinner} />
          ) : !slots.length ? (
            <Text style={styles.empty}>Dr. {booking.doctorName} has no free times in the coming days. You can see the next available doctor or take a full refund instead.</Text>
          ) : (
            <ScrollView style={styles.slotScroll} contentContainerStyle={styles.slotList}>
              {days.map((day) => (
                <View key={day.key} style={styles.day}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <View style={styles.slotGrid}>
                    {day.slots.map((s) => {
                      const on = picked === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          testID={`reschedule-slot-${s.id}`}
                          style={[styles.slot, on && styles.slotOn]}
                          onPress={() => {
                            hapticImpact(ImpactFeedbackStyle.Light);
                            setPicked(s.id);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`${day.label}, ${formatIstTime(s.startsAt)}`}>
                          <Text style={[styles.slotText, on && styles.slotTextOn]}>{formatIstTime(s.startsAt)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          <Pressable
            testID="reschedule-confirm"
            style={[styles.primary, (!picked || busy) && styles.dim]}
            disabled={!picked || busy}
            onPress={() => void confirm()}
            accessibilityRole="button"
            accessibilityLabel="Confirm new time">
            {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Confirm new time</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Shown once the doctor is 5+ minutes late and not in the room. Every option is checked again by
 * the server, which refuses them while the doctor is not actually late.
 */
export function DoctorDelayCard({ booking, delay, onResolved, onDark = false }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'options' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dr = `Dr. ${booking.doctorName}`;
  const elapsed = formatMmSs(delay.elapsedSeconds);
  const offer = step.kind === 'reassign' ? step.option : null;

  async function findDoctor() {
    hapticImpact(ImpactFeedbackStyle.Light);
    setError(null);
    setStep({ kind: 'reassign-loading' });
    try {
      setStep({ kind: 'reassign', option: await consult.reassignOption(booking.consultationId) });
    } catch (e) {
      setError(friendlyError(e, 'We could not look for another doctor.'));
      setStep({ kind: 'options' });
    }
  }

  async function switchDoctor(option: ReassignOption) {
    setBusy(true);
    setError(null);
    try {
      await consult.reassign(booking.consultationId, option.slot.id);
      hapticNotify(NotificationFeedbackType.Success);
      onResolved('reassigned');
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setError(friendlyError(e, 'We could not switch your doctor.'));
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    setBusy(true);
    setError(null);
    try {
      const result = await consult.cancel(booking.consultationId, 'DOCTOR_LATE');
      hapticNotify(NotificationFeedbackType.Success);
      setStep({ kind: 'refunded', result });
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setError(friendlyError(e, 'We could not cancel your consultation.'));
    } finally {
      setBusy(false);
    }
  }

  if (step.kind === 'waiting') {
    return (
      <View style={[styles.slim, onDark && styles.slimDark]} testID="delay-waiting" accessibilityLiveRegion="polite">
        <View style={styles.dot} />
        <Text style={[styles.slimText, onDark && styles.onDarkText]}>
          Waiting for {dr} · <Text style={styles.bold}>{elapsed}</Text> past start
        </Text>
        <Pressable onPress={() => setStep({ kind: 'options' })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Show options">
          <Text style={[styles.link, onDark && styles.onDarkLink]}>Options</Text>
        </Pressable>
      </View>
    );
  }

  if (step.kind === 'refunded') {
    const { result } = step;
    return (
      <View style={styles.card} testID="delay-refunded" accessibilityLiveRegion="polite">
        <Text style={styles.okTitle} accessibilityRole="header">✓ Consultation cancelled</Text>
        <Text style={styles.body}>
          Full refund of <Text style={styles.bold}>{formatPaise(result.refundPaise)}</Text>
          {result.refundStatus === 'PROCESSED' ? ' sent.' : ' started.'}
        </Text>
        <Text style={styles.muted}>{refundEta(result.refundStatus)}</Text>
        <Pressable testID="delay-refund-done" style={styles.primary} onPress={() => onResolved('refunded')} accessibilityRole="button">
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="delay-card">
      <View style={styles.banner} accessibilityLiveRegion="polite">
        <Text style={styles.bannerTitle} accessibilityRole="header">
          {dr} is running about {delay.minutesLate} minutes late
        </Text>
        <Text style={styles.timer} testID="delay-elapsed">⏱ {elapsed} past your start time</Text>
      </View>
      <Text style={styles.body}>
        Doctors occasionally run late with emergency patients. You can continue waiting or choose an option below.
      </Text>
      {delay.autoRefundAt ? (
        <Text style={styles.muted}>
          If {dr} has not joined by {formatIstTime(delay.autoRefundAt)}, we cancel and refund you in full automatically.
        </Text>
      ) : null}

      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}

      <Pressable testID="delay-continue" style={styles.option} onPress={() => setStep({ kind: 'waiting' })} accessibilityRole="button">
        <Text style={styles.optionIcon}>⏳</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>Continue Waiting</Text>
          <Text style={styles.optionSub}>Stay in the queue; we show you the moment {dr} joins.</Text>
        </View>
      </Pressable>

      <Pressable
        testID="delay-reschedule"
        style={styles.option}
        onPress={() => {
          hapticImpact(ImpactFeedbackStyle.Light);
          setSheetOpen(true);
        }}
        accessibilityRole="button">
        <Text style={styles.optionIcon}>📅</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>Reschedule for Free</Text>
          <Text style={styles.optionSub}>Pick another time with {dr}. No extra payment.</Text>
        </View>
      </Pressable>

      <Pressable
        testID="delay-reassign"
        style={styles.option}
        disabled={step.kind === 'reassign-loading'}
        onPress={() => void findDoctor()}
        accessibilityRole="button">
        <Text style={styles.optionIcon}>🩺</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>Consult Next Available Doctor</Text>
          <Text style={styles.optionSub}>Another {booking.specialty} doctor free within the hour, at no extra cost.</Text>
        </View>
        {step.kind === 'reassign-loading' ? <ActivityIndicator color={Colors.primary} /> : null}
      </Pressable>
      {step.kind === 'reassign' ? (
        offer ? (
          <View style={styles.confirmBox} testID="reassign-offer">
            <Text style={styles.confirmTitle}>Dr. {offer.doctor.displayName}</Text>
            <Text style={styles.muted}>
              {[offer.doctor.qualification, `${offer.doctor.experienceYears} yrs`, offer.doctor.specialty].join(' · ')}
            </Text>
            <Text style={styles.body}>Can see you at {formatIstTime(offer.slot.startsAt)} (Indian time).</Text>
            <Pressable
              testID="reassign-confirm"
              style={[styles.primary, busy && styles.dim]}
              disabled={busy}
              onPress={() => void switchDoctor(offer)}
              accessibilityRole="button">
              {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Switch to Dr. {offer.doctor.displayName}</Text>}
            </Pressable>
          </View>
        ) : (
          <Text style={styles.muted} testID="reassign-none">
            No other {booking.specialty} doctor is free in the next hour. You can reschedule for free or take a full refund.
          </Text>
        )
      ) : null}

      <Pressable
        testID="delay-refund"
        style={[styles.option, styles.optionRefund]}
        onPress={() => setStep({ kind: 'refund-confirm' })}
        accessibilityRole="button">
        <Text style={styles.optionIcon}>↩️</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>Request Instant 100% Refund</Text>
          <Text style={styles.optionSub}>Cancel and get {formatPaise(booking.amountPaise)} back to your original payment method.</Text>
        </View>
      </Pressable>
      {step.kind === 'refund-confirm' ? (
        <View style={styles.confirmBox} testID="refund-confirm-box">
          <Text style={styles.body}>Cancel this consultation and refund {formatPaise(booking.amountPaise)} in full?</Text>
          <View style={styles.rowGap}>
            <Pressable style={styles.secondary} onPress={() => setStep({ kind: 'options' })} accessibilityRole="button">
              <Text style={styles.secondaryText}>Keep booking</Text>
            </Pressable>
            <Pressable
              testID="delay-refund-confirm"
              style={[styles.danger, busy && styles.dim]}
              disabled={busy}
              onPress={() => void refund()}
              accessibilityRole="button">
              {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Cancel & refund</Text>}
            </Pressable>
          </View>
        </View>
      ) : null}

      <RescheduleSheet
        booking={booking}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onDone={() => {
          setSheetOpen(false);
          onResolved('rescheduled');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 10, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.warning },
  banner: { gap: 4, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.warningTint },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#92400e' },
  timer: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  body: { fontSize: 14, color: Colors.foreground, lineHeight: 20 },
  muted: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17 },
  bold: { fontWeight: '800' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  optionRefund: { borderColor: Colors.primarySubtle },
  optionIcon: { fontSize: 20 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  optionSub: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },
  confirmBox: { gap: 8, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  confirmTitle: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  rowGap: { flexDirection: 'row', gap: 10 },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primary, paddingHorizontal: 16 },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondary: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
  danger: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.destructive },
  dim: { opacity: 0.6 },
  okTitle: { fontSize: 16, fontWeight: '800', color: Colors.success },
  errorText: { color: Colors.destructive, fontSize: 13, fontWeight: '600' },
  link: { color: Colors.primary, fontWeight: '700' },
  onDarkLink: { color: '#C4B5FD' },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.warningTint },
  slimDark: { backgroundColor: 'rgba(15, 23, 42, 0.92)' },
  slimText: { flex: 1, fontSize: 13, color: '#92400e' },
  onDarkText: { color: '#FDE68A' },
  dot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.warning },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { maxHeight: '85%', gap: 10, padding: 16, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, backgroundColor: Colors.card },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.foreground },
  sheetSub: { fontSize: 13, color: Colors.mutedForeground },
  close: { fontSize: 18, color: Colors.mutedForeground, fontWeight: '700' },
  spinner: { paddingVertical: 24 },
  empty: { fontSize: 14, color: Colors.mutedForeground, paddingVertical: 16 },
  inlineError: { gap: 6, paddingVertical: 12 },
  slotScroll: { flexGrow: 0 },
  slotList: { gap: 14, paddingBottom: 8 },
  day: { gap: 8 },
  dayLabel: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  slotOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotText: { fontWeight: '700', color: Colors.foreground },
  slotTextOn: { color: Colors.primaryForeground },
});
