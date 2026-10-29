import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { BookingView } from '@/lib/consult/types';

interface Props {
  booking: BookingView;
  onRefresh: () => void;
}

export function PrescriptionTimeline({ booking, onRefresh }: Props) {
  const previousStatusRef = useRef(booking.rxStatus);

  const isCompleted = booking.status === 'COMPLETED';
  const isIssued = booking.hasPrescription || booking.rxStatus === 'ISSUED';
  const isDrafting = booking.rxStatus === 'DRAFTING';
  const isNotRequired = booking.rxStatus === 'NOT_REQUIRED';

  // Haptic feedback when prescription status changes to ISSUED
  useEffect(() => {
    if (previousStatusRef.current !== 'ISSUED' && isIssued) {
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Suppress on unsupported environments
      }
    }
    previousStatusRef.current = booking.rxStatus;
  }, [booking.rxStatus, isIssued]);

  // Auto-poll while doctor is drafting or pending after call completion
  useEffect(() => {
    if (!isCompleted || isIssued || isNotRequired) return;

    const timer = setInterval(() => {
      onRefresh();
    }, 4000);

    return () => clearInterval(timer);
  }, [isCompleted, isDrafting, isIssued, isNotRequired, onRefresh]);

  return (
    <View style={styles.card} accessibilityRole="region" accessibilityLabel="Prescription progress timeline">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Consultation Status</Text>
        {isDrafting && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Doctor Writing</Text>
          </View>
        )}
      </View>

      <View style={styles.timeline}>
        {/* Step 1: Consultation Completed */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconBox, styles.stepCompleted]}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Consultation Completed</Text>
            <Text style={styles.stepSub}>With Dr. {booking.doctorName}</Text>
          </View>
        </View>

        <View style={styles.stepLine} />

        {/* Step 2: Doctor Prescription / Notes */}
        <View style={styles.stepRow}>
          <View
            style={[
              styles.stepIconBox,
              isIssued || isNotRequired
                ? styles.stepCompleted
                : isDrafting
                ? styles.stepActive
                : styles.stepPending,
            ]}>
            {isIssued || isNotRequired ? (
              <Text style={styles.checkIcon}>✓</Text>
            ) : isDrafting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.pendingIcon}>✍️</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isIssued
                ? 'Prescription Generated'
                : isNotRequired
                ? 'No Prescription Required'
                : isDrafting
                ? 'Doctor Drafting Prescription...'
                : 'Awaiting Prescription Notes'}
            </Text>
            <Text style={styles.stepSub}>
              {isIssued
                ? 'Signed by doctor and ready for review'
                : isNotRequired
                ? 'Doctor determined no tests or medicines needed'
                : isDrafting
                ? 'Doctor is typing your medicines and clinical advice'
                : 'Prescription will appear as soon as the doctor issues it'}
            </Text>
          </View>
        </View>

        <View style={styles.stepLine} />

        {/* Step 3: Ready for Patient */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconBox, isIssued ? styles.stepCompleted : styles.stepPending]}>
            <Text style={isIssued ? styles.checkIcon : styles.pendingIcon}>
              {isIssued ? '✓' : '📄'}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {isIssued ? 'Prescription Ready' : 'Download & Medicine Orders'}
            </Text>
            <Text style={styles.stepSub}>
              {isIssued
                ? 'You can download the PDF or book prescribed tests directly'
                : 'Unlocked once prescription is issued'}
            </Text>
          </View>
        </View>
      </View>

      {!isIssued && !isNotRequired && (
        <Pressable
          style={styles.refreshBtn}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Check prescription status again">
          <Text style={styles.refreshBtnText}>Check Again ↻</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.foreground,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  timeline: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: Colors.tealTint,
    borderWidth: 1.5,
    borderColor: Colors.teal,
  },
  stepActive: {
    backgroundColor: Colors.primaryTint,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  stepPending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  checkIcon: {
    color: Colors.teal,
    fontWeight: '800',
    fontSize: 14,
  },
  pendingIcon: {
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  stepSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginLeft: 15,
    marginVertical: 3,
  },
  refreshBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryTint,
  },
  refreshBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
