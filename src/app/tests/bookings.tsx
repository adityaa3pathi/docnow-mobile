import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { bookingsApi, invoicesApi } from '@/lib/tests/api';
import type { TestBooking } from '@/lib/tests/types';

export default function TestBookingsScreen() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<TestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await bookingsApi.list();
      setBookings(list || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    bookingsApi
      .list()
      .then((list) => {
        if (!cancelled) {
          setBookings(list || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookings([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancelBooking = (booking: TestBooking) => {
    Alert.alert('Cancel Test Booking', 'Are you sure you want to cancel this booking? If paid online, a 100% refund will be automatically credited to your original payment method.', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingId(booking.id);
            await bookingsApi.cancel(booking.id, 'Cancelled by patient from mobile app');
            Alert.alert('Booking Cancelled', 'Your booking has been cancelled and refund initiated.');
            await fetchBookings();
          } catch (err: any) {
            Alert.alert(
              'Cannot Cancel',
              err?.response?.data?.message || 'Sample collection is already in progress or completed.',
            );
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  // The download URL needs the sign-in header, which a browser does not send; the viewer uses a signed link.
  const handleDownloadReport = (reportId: string) => {
    router.push({ pathname: '/records/report/[id]', params: { id: reportId } });
  };

  const handleDownloadInvoice = async (bookingId: string) => {
    const url = invoicesApi.downloadUrl(bookingId);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {
        Alert.alert('Download Error', 'Could not open invoice.');
      });
    }
  };

  const renderBooking = ({ item }: { item: TestBooking }) => {
    const isCancelled = item.status.toLowerCase().includes('cancel');
    const isCompleted = item.status.toLowerCase().includes('complete') || item.status.toLowerCase().includes('report');
    const isCancelling = cancellingId === item.id;

    return (
      <View style={styles.card}>
        {/* Header: Date + Status Badge */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.slotDate}>{item.slotDate}</Text>
            <Text style={styles.slotTime}>{item.slotTime}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isCancelled && styles.statusBadgeCancelled,
              isCompleted && styles.statusBadgeCompleted,
            ]}>
            <Text
              style={[
                styles.statusText,
                isCancelled && { color: Colors.destructive },
                isCompleted && { color: Colors.success },
              ]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Address */}
        {item.addressLine && (
          <Text style={styles.addressText} numberOfLines={2}>
            📍 {item.addressLine}, {item.addressCity} ({item.addressPincode})
          </Text>
        )}

        {/* Test Items */}
        <View style={styles.itemsBox}>
          {item.items?.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.testName}</Text>
              <Text style={styles.itemPatient}>
                ({it.patient?.name || 'Self'})
              </Text>
            </View>
          ))}
        </View>

        {/* Phlebotomist Details (if assigned) */}
        {item.phleboName && !isCancelled && (
          <View style={styles.phleboCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.phleboLabel}>Assigned Phlebotomist</Text>
              <Text style={styles.phleboName}>{item.phleboName}</Text>
            </View>
            {item.phleboPhone && (
              <Pressable
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${item.phleboPhone}`)}>
                <Text style={styles.callBtnText}>📞 Call</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Reports (if available) */}
        {item.reports && item.reports.length > 0 && (
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Certified Lab Reports</Text>
            {item.reports.map((rep) => (
              <Pressable
                key={rep.id}
                style={styles.downloadBtn}
                onPress={() => handleDownloadReport(rep.id)}>
                <Text style={styles.downloadBtnText}>📄 Download Official Report (PDF)</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Card Footer: Total Amount + Actions */}
        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{formatRupees(item.finalAmount)}</Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleDownloadInvoice(item.id)}
              hitSlop={8}>
              <Text style={styles.invoiceLink}>Invoice</Text>
            </Pressable>

            {!isCancelled && !isCompleted && (
              <Pressable
                onPress={() => handleCancelBooking(item)}
                disabled={isCancelling}
                hitSlop={8}
                style={styles.cancelBtn}>
                {isCancelling ? (
                  <ActivityIndicator size="small" color={Colors.destructive} />
                ) : (
                  <Text style={styles.cancelText}>Cancel</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Diagnostic Bookings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching your bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No test bookings yet</Text>
          <Text style={styles.emptySub}>
            Your scheduled at-home blood test appointments and lab reports will appear here.
          </Text>
          <Pressable
            style={styles.bookBtn}
            onPress={() => router.push('/tests/explore')}>
            <Text style={styles.bookBtnText}>Explore Tests & Packages</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 28,
    color: Colors.foreground,
    lineHeight: 32,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.foreground,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  slotTime: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  statusBadgeCancelled: {
    backgroundColor: Colors.destructiveTint,
  },
  statusBadgeCompleted: {
    backgroundColor: Colors.successTint,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 8,
  },
  itemsBox: {
    backgroundColor: Colors.cardMuted,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  itemPatient: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginLeft: 6,
  },
  phleboCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tealTint,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 10,
  },
  phleboLabel: {
    fontSize: 11,
    color: Colors.teal,
    fontWeight: '600',
  },
  phleboName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  reportSection: {
    marginTop: 12,
  },
  reportSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 6,
  },
  downloadBtn: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  downloadBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.foreground,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  invoiceLink: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.destructive,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 20,
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
