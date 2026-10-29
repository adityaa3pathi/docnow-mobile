import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { bookingsApi } from '@/lib/tests/api';
import type { TestBooking } from '@/lib/tests/types';

export default function BookingConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<TestBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    bookingsApi
      .status(bookingId)
      .then(setBooking)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success Icon & Heading */}
        <View style={styles.successHeader}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>
          <Text style={styles.title}>Home Collection Scheduled!</Text>
          <Text style={styles.sub}>
            Your test booking has been confirmed with our NABL certified diagnostic lab partner.
          </Text>
          {bookingId && (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>Booking ID: {bookingId.slice(0, 8).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : booking ? (
          <View style={styles.detailsCard}>
            <Text style={styles.cardHeading}>Appointment Details</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Scheduled Date</Text>
              <Text style={styles.val}>{booking.slotDate}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Collection Window</Text>
              <Text style={styles.val}>{booking.slotTime}</Text>
            </View>

            {booking.addressLine && (
              <View style={styles.row}>
                <Text style={styles.label}>Collection Address</Text>
                <Text style={[styles.val, { flex: 1, textAlign: 'right' }]}>
                  {booking.addressLine}, {booking.addressCity} ({booking.addressPincode})
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Total Amount Paid</Text>
              <Text style={[styles.val, { color: Colors.primary, fontWeight: '800' }]}>
                {formatRupees(booking.finalAmount)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* What Happens Next Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardHeading}>What Happens Next?</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepDotActive} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>1. Phlebotomist Assigned</Text>
              <Text style={styles.stepSub}>
                A certified medical technician will be assigned 2 hours prior to your slot.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>2. Safe Home Sample Collection</Text>
              <Text style={styles.stepSub}>
                Samples are collected using single-use, barcoded vacutainer tubes with cold-chain transport.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>3. Fast Digital Reports</Text>
              <Text style={styles.stepSub}>
                Certified digital lab reports will be delivered on your DocNow app within 24-48 hours.
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace('/tests/bookings')}>
            <Text style={styles.primaryBtnText}>View & Track Booking ›</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 20,
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iconText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.foreground,
    marginTop: 16,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  idBadge: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  detailsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  val: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  timelineCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepDotActive: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    marginTop: 4,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.muted,
    marginTop: 4,
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
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
  },
});
