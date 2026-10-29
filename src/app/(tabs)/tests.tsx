import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/tests/empty-state';
import { PatientSheet } from '@/components/tests/patient-sheet';
import { CartItemSkeleton } from '@/components/tests/test-card-skeleton';
import { AccreditationBanner } from '@/components/tests/trust-badges';
import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import {
  calculateCollectionFee,
  SAMPLE_COLLECTION_FEE,
  SAMPLE_COLLECTION_FEE_THRESHOLD,
} from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { CartItem, Patient } from '@/lib/tests/types';

export default function TestsCartScreen() {
  const insets = useSafeAreaInsets();
  const {
    cart,
    items,
    loading,
    refreshCart,
    removeFromCart,
    assignPatient,
    clearCart,
  } = useCart();
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Patient sheet state
  const [assigningItem, setAssigningItem] = useState<CartItem | null>(null);
  const [showPatientSheet, setShowPatientSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshCart();
    }, [refreshCart]),
  );

  const handleRemove = async (itemId: string) => {
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      setRemovingId(itemId);
      const success = await removeFromCart(itemId);
      if (!success) {
        Alert.alert('Error', 'Unable to remove test from cart');
      }
    } catch {
      Alert.alert('Error', 'Unable to remove test from cart');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all tests from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearCart();
          } catch {
            Alert.alert('Error', 'Unable to clear cart');
          }
        },
      },
    ]);
  };

  const handlePatientSelect = async (patient: Patient) => {
    if (!assigningItem) return;
    try {
      const success = await assignPatient(assigningItem.id, patient.id);
      if (!success) {
        Alert.alert('Error', 'Failed to assign family member to this test');
      }
    } catch {
      Alert.alert('Error', 'Failed to assign family member to this test');
    } finally {
      setAssigningItem(null);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const collectionFee = calculateCollectionFee(subtotal);
  const total = subtotal + collectionFee;
  const shortfall = SAMPLE_COLLECTION_FEE_THRESHOLD - subtotal;

  const renderItem = ({ item }: { item: CartItem }) => {
    const isRemoving = removingId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.testName}
            </Text>
            <Text style={styles.itemPrice}>{formatRupees(item.price)}</Text>
          </View>

          <Pressable
            onPress={() => handleRemove(item.id)}
            disabled={isRemoving}
            hitSlop={10}
            style={styles.removeBtn}>
            {isRemoving ? (
              <ActivityIndicator size="small" color={Colors.destructive} />
            ) : (
              <Text style={styles.removeBtnText}>✕</Text>
            )}
          </Pressable>
        </View>

        {/* Patient Assignment Selector */}
        <Pressable
          style={styles.patientRow}
          onPress={() => {
            setAssigningItem(item);
            setShowPatientSheet(true);
          }}>
          <View style={styles.patientBadge}>
            <Text style={styles.patientLabel}>Patient:</Text>
            <Text style={styles.patientValue}>
              {item.patient?.name ? `${item.patient.name} (${item.patient.relation})` : 'Self (Tap to change)'}
            </Text>
          </View>
          <Text style={styles.changeLink}>Change ›</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diagnostic Cart</Text>
        {items.length > 0 && (
          <Pressable onPress={handleClearCart} hitSlop={10}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {loading && !cart ? (
        <CartItemSkeleton />
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="🛒"
            title="Your diagnostic cart is empty"
            subtitle="Save up to 70% on preventive health checkups with free certified home collection."
            actionLabel="Browse Tests & Health Packages"
            onAction={() => router.push('/tests/explore')}
            secondaryLabel="Consult a Doctor First ›"
            onSecondaryAction={() => router.push('/(tabs)')}
            style={styles.emptyStateFill}
          />
          <AccreditationBanner style={styles.emptyBanner} />
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <View style={styles.deliveryNotice}>
                  <Text style={styles.noticeIcon}>🏠</Text>
                  <Text style={styles.noticeText}>
                    Free home sample collection by NABL & CAP accredited partners
                  </Text>
                </View>

                {shortfall > 0 && (
                  <View style={styles.shortfallBox}>
                    <Text style={styles.shortfallText}>
                      Add tests worth <Text style={{ fontWeight: '700' }}>{formatRupees(shortfall)}</Text> more for <Text style={{ fontWeight: '700', color: Colors.success }}>FREE</Text> home collection!
                    </Text>
                  </View>
                )}
              </View>
            }
            ListFooterComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Bill Details</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Test Fees</Text>
                  <Text style={styles.summaryVal}>{formatRupees(subtotal)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Home Sample Collection</Text>
                  <Text style={[styles.summaryVal, collectionFee === 0 && { color: Colors.success }]}>
                    {collectionFee === 0 ? 'FREE' : formatRupees(SAMPLE_COLLECTION_FEE)}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalVal}>{formatRupees(total)}</Text>
                </View>

                <Pressable
                  style={styles.addMoreBtn}
                  onPress={() => router.push('/tests/explore')}>
                  <Text style={styles.addMoreText}>+ Add More Tests</Text>
                </Pressable>
              </View>
            }
          />

          {/* Sticky Bottom Bar */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <AccreditationBanner variant="compact" style={styles.bottomTrust} />
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.bottomTotalLabel}>Total Amount</Text>
                <Text style={styles.bottomTotal}>{formatRupees(total)}</Text>
              </View>

              <Pressable
                style={styles.checkoutBtn}
                onPress={() => router.push('/tests/checkout')}>
                <Text style={styles.checkoutBtnText}>Select Slot & Address ›</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Patient Assignment Modal */}
      <PatientSheet
        visible={showPatientSheet}
        selectedId={assigningItem?.patientId}
        onSelect={handlePatientSelect}
        onClose={() => {
          setShowPatientSheet(false);
          setAssigningItem(null);
        }}
      />
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
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.destructive,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyStateFill: {
    paddingHorizontal: 30,
  },
  emptyBanner: {
    borderBottomWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.primarySubtle,
  },
  listContent: {
    padding: 16,
    paddingBottom: 140,
  },
  listHeader: {
    marginBottom: 12,
  },
  deliveryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tealTint,
    borderRadius: Radius.md,
    padding: 12,
    gap: 8,
  },
  noticeIcon: {
    fontSize: 16,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.teal,
    flex: 1,
  },
  shortfallBox: {
    backgroundColor: Colors.amberTint,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 8,
  },
  shortfallText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
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
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 16,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  patientLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  patientValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.foreground,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.foreground,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  addMoreBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
  },
  addMoreText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTrust: {
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
