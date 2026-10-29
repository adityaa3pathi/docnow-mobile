import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { consult } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';
import type { BookingView } from '@/lib/consult/types';
import { bookingsApi } from '@/lib/tests/api';
import type { TestBooking } from '@/lib/tests/types';

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'consultations' | 'tests'>('consultations');

  const [consultations, setConsultations] = useState<BookingView[]>([]);
  const [testBookings, setTestBookings] = useState<TestBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cons, tests] = await Promise.all([
        consult.bookings().catch(() => []),
        bookingsApi.list().catch(() => []),
      ]);
      setConsultations(cons || []);
      setTestBookings(tests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // The download URL needs the sign-in header, which a browser does not send; the viewer uses a signed link.
  const handleDownloadReport = (reportId: string) => {
    router.push({ pathname: '/records/report/[id]' as any, params: { id: reportId } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Health Records</Text>
        <Text style={styles.headerSub}>Prescriptions, consultations & certified lab reports</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'consultations' && styles.tabBtnActive]}
          onPress={() => setTab('consultations')}>
          <Text style={[styles.tabText, tab === 'consultations' && styles.tabTextActive]}>
            🩺 Consultations ({consultations.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, tab === 'tests' && styles.tabBtnActive]}
          onPress={() => setTab('tests')}>
          <Text style={[styles.tabText, tab === 'tests' && styles.tabTextActive]}>
            🧪 Lab Tests ({testBookings.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading health records...</Text>
        </View>
      ) : tab === 'consultations' ? (
        consultations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🩺</Text>
            <Text style={styles.emptyTitle}>No consultations yet</Text>
            <Text style={styles.emptySub}>
              Schedule a video consultation with verified specialists. Your digital prescriptions will be saved here.
            </Text>
            <Pressable
              style={styles.actionBtn}
              onPress={() => router.push('/(tabs)')}>
              <Text style={styles.actionBtnText}>Find a Doctor</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={consultations}
            keyExtractor={(c) => c.consultationId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/consult/booking/[id]', params: { id: item.consultationId } })}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>{item.doctorName}</Text>
                    <Text style={styles.specialty}>{item.specialty}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>
                    📅 {new Date(item.startsAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })} • {new Date(item.startsAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.feeText}>{formatRupees(Math.round(item.amountPaise / 100))}</Text>
                  <Text style={styles.viewLink}>View Details & Prescription ›</Text>
                </View>
              </Pressable>
            )}
          />
        )
      ) : testBookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🧪</Text>
          <Text style={styles.emptyTitle}>No lab tests booked</Text>
          <Text style={styles.emptySub}>
            Book at-home diagnostic blood tests and full-body health checkup packages.
          </Text>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push('/tests/explore')}>
            <Text style={styles.actionBtnText}>Explore Lab Tests</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={testBookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>Home Sample Collection</Text>
                  <Text style={styles.specialty}>
                    📅 {item.slotDate} • {item.slotTime}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: Colors.tealTint }]}>
                  <Text style={[styles.statusPillText, { color: Colors.teal }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.testList}>
                {item.items?.map((t) => (
                  <Text key={t.id} style={styles.testItem}>
                    • {t.testName} ({t.patient?.name || 'Self'})
                  </Text>
                ))}
              </View>

              {item.reports && item.reports.length > 0 && (
                <View style={styles.reportRow}>
                  {item.reports.map((rep) => (
                    <Pressable
                      key={rep.id}
                      style={styles.pdfBtn}
                      onPress={() => handleDownloadReport(rep.id)}>
                      <Text style={styles.pdfBtnText}>📄 Download Official Lab Report (PDF)</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.cardBottom}>
                <Text style={styles.feeText}>{formatRupees(item.finalAmount)}</Text>
                <Pressable onPress={() => router.push('/tests/bookings')}>
                  <Text style={styles.viewLink}>Track Order ›</Text>
                </Pressable>
              </View>
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  specialty: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  timeRow: {
    marginTop: 10,
  },
  timeText: {
    fontSize: 13,
    color: Colors.foreground,
    fontWeight: '500',
  },
  testList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  testItem: {
    fontSize: 12,
    color: Colors.foreground,
    lineHeight: 18,
  },
  reportRow: {
    marginTop: 10,
  },
  pdfBtn: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  feeText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.foreground,
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
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
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
