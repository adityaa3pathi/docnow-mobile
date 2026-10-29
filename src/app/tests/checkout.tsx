import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSheet } from '@/components/tests/address-sheet';
import { PromoSection } from '@/components/tests/promo-section';
import { SlotPicker } from '@/components/tests/slot-picker';
import { Colors, Radius } from '@/constants/theme';
import { useTestCheckout } from '@/hooks/use-test-checkout';
import { formatRupees } from '@/lib/consult/format';
import {
  addressesApi,
  calculateCollectionFee,
  cartApi,
  SAMPLE_COLLECTION_FEE,
} from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { Address, Cart, PromoValidationResult, Slot } from '@/lib/tests/types';

export default function TestCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { refreshCart } = useCart();
  const { startCheckout, submitting } = useTestCheckout();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  // Address state
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressSheet, setShowAddressSheet] = useState(false);

  // Slot state
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>('');

  // Promo state
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null);

  // Load initial cart and default address
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        setLoading(true);
        const [cartData, addressList] = await Promise.all([
          cartApi.get(),
          addressesApi.list().catch(() => []),
        ]);

        if (!cancelled) {
          setCart(cartData);
          if (addressList?.length > 0) {
            const active = addressList.find((a) => !a.isDeleted);
            if (active) setSelectedAddress(active);
          }
        }
      } catch {
        // error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const collectionFee = calculateCollectionFee(subtotal);
  const discount = appliedPromo?.discountAmount || 0;
  const total = Math.max(0, subtotal + collectionFee - discount);

  const handlePay = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a home sample pickup address.');
      setShowAddressSheet(true);
      return;
    }

    if (!selectedSlot || !selectedSlotDate) {
      Alert.alert('Time Slot Required', 'Please choose an available collection date and 1-hour time window.');
      return;
    }

    if (!cart?.id || items.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty.');
      router.replace('/(tabs)/tests');
      return;
    }

    const res = await startCheckout({
      slot: selectedSlot,
      slotDate: selectedSlotDate,
      address: selectedAddress,
      promo: appliedPromo,
      cartId: cart.id,
    });

    if (res.success && res.bookingId) {
      await refreshCart();
      router.replace({
        pathname: '/tests/confirmation',
        params: { bookingId: res.bookingId },
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparing checkout...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Review & Schedule Pickup</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step 1: Order Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardStep}>STEP 1</Text>
            <Text style={styles.cardTitle}>Tests in Booking ({items.length})</Text>
          </View>

          {items.map((i) => (
            <View key={i.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.testName}>{i.testName}</Text>
                <Text style={styles.patientInfo}>
                  For: {i.patient?.name ? `${i.patient.name} (${i.patient.relation})` : 'Self'}
                </Text>
              </View>
              <Text style={styles.testPrice}>{formatRupees(i.price)}</Text>
            </View>
          ))}
        </View>

        {/* Step 2: Pickup Address */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardStep}>STEP 2</Text>
            <Text style={styles.cardTitle}>Sample Collection Address</Text>
          </View>

          {selectedAddress ? (
            <View style={styles.selectedAddressBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLine}>{selectedAddress.line1}</Text>
                <Text style={styles.addressSub}>
                  {selectedAddress.city} — {selectedAddress.pincode}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAddressSheet(true)}
                style={styles.changeAddressBtn}>
                <Text style={styles.changeAddressText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addAddressTrigger}
              onPress={() => setShowAddressSheet(true)}>
              <Text style={styles.addAddressText}>+ Select or Add Home Address</Text>
            </Pressable>
          )}
        </View>

        {/* Step 3: Date & Slot Picker */}
        {selectedAddress ? (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardStep}>STEP 3</Text>
              <Text style={styles.cardTitle}>Phlebotomist Visit Window</Text>
            </View>

            <SlotPicker
              key={`${selectedAddress.id}-${selectedAddress.pincode}`}
              address={selectedAddress}
              selectedSlot={selectedSlot}
              onSlotSelect={(slot, date) => {
                setSelectedSlot(slot);
                setSelectedSlotDate(date);
              }}
            />
          </View>
        ) : null}

        {/* Step 4: Promo Coupons */}
        <View style={styles.sectionCard}>
          <PromoSection
            cartAmount={subtotal}
            appliedPromo={appliedPromo}
            onApply={setAppliedPromo}
          />
        </View>

        {/* Step 5: Bill Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Final Payment Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billVal}>{formatRupees(subtotal)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Home Collection Charge</Text>
            <Text style={[styles.billVal, collectionFee === 0 && { color: Colors.success }]}>
              {collectionFee === 0 ? 'FREE' : formatRupees(SAMPLE_COLLECTION_FEE)}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: Colors.success }]}>Coupon Discount ({appliedPromo?.code})</Text>
              <Text style={[styles.billVal, { color: Colors.success }]}>- {formatRupees(discount)}</Text>
            </View>
          )}

          <View style={[styles.billRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total Amount Payable</Text>
            <Text style={styles.grandTotalVal}>{formatRupees(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomLabel}>Amount Payable</Text>
          <Text style={styles.bottomAmount}>{formatRupees(total)}</Text>
        </View>

        <Pressable
          style={[styles.payBtn, submitting && { opacity: 0.7 }]}
          disabled={submitting}
          onPress={handlePay}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Confirm & Pay ›</Text>
          )}
        </Pressable>
      </View>

      {/* Address Selection Modal */}
      <AddressSheet
        visible={showAddressSheet}
        selectedId={selectedAddress?.id}
        onSelect={(addr) => setSelectedAddress(addr)}
        onClose={() => setShowAddressSheet(false)}
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
  scroll: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardStep: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  patientInfo: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  testPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    marginLeft: 10,
  },
  selectedAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardMuted,
    borderRadius: Radius.md,
    padding: 12,
  },
  addressLine: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    lineHeight: 20,
  },
  addressSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 3,
  },
  changeAddressBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySubtle,
    marginLeft: 10,
  },
  changeAddressText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  addAddressTrigger: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addAddressText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.foreground,
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
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
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  bottomAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 26,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.mutedForeground,
  },
});
