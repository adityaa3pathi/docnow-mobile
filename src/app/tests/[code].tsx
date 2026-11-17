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

import { EmptyState, ErrorRetryState } from '@/components/tests/empty-state';
import { TestDetailSkeleton } from '@/components/tests/test-card-skeleton';
import { PhlebotomistGuaranteeCard } from '@/components/tests/trust-badges';
import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';
import { catalogApi } from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { CatalogItem } from '@/lib/tests/types';

export default function TestDetailScreen() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { cartCount, addToCart, getItemCount } = useCart();

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setLoadFailed(false);
        const prod = await catalogApi.detail(code as string);
        if (!cancelled) {
          setItem(prod);
        }
      } catch (err: any) {
        // A 404 falls through to "Test not found"; anything else is retryable
        if (!cancelled && err?.response?.status !== 404) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [code, reloadKey]);

  const handleAddToCart = async () => {
    if (!item) return;
    try {
      setAdding(true);
      const added = await addToCart(item.partnerCode);
      hapticNotify(added ? NotificationFeedbackType.Success : NotificationFeedbackType.Error);
    } catch {
      // Handled
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <TestDetailSkeleton />;
  }

  if (!item) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {loadFailed ? (
          <ErrorRetryState
            title="Couldn’t load test details"
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        ) : (
          <EmptyState
            icon="🧪"
            title="Test not found"
            subtitle="This test may have been discontinued or is unavailable right now."
            actionLabel="Browse All Tests"
            onAction={() => router.replace({ pathname: '/tests/explore', params: { segment: 'tests' } })}
            secondaryLabel="Go Back"
            onSecondaryAction={() => router.back()}
          />
        )}
      </View>
    );
  }

  const price = item.discountedPrice ?? item.displayPrice;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.displayPrice;
  const count = getItemCount(item.partnerCode);
  const discountPercent = hasDiscount
    ? Math.round(((item.displayPrice - item.discountedPrice!) / item.displayPrice) * 100)
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/tests')}
          hitSlop={10}
          style={styles.cartIconBox}>
          <Text style={styles.cartIconText}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          <View style={styles.certBadge}>
            <Text style={styles.certBadgeText}>✓ NABL & CAP Certified Partner</Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>{item.name}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatRupees(price)}</Text>
              {hasDiscount && <Text style={styles.mrp}>{formatRupees(item.displayPrice)}</Text>}
            </View>
            {hasDiscount && (
              <Text style={styles.discountBadge}>Save {discountPercent}% on this test</Text>
            )}
          </View>
          <View style={styles.guaranteeBox}>
            <Text style={styles.guaranteeText}>100% Free Home Sample Collection on orders above ₹500</Text>
          </View>
        </View>

        {/* Clinical Info Cards */}
        <View style={styles.infoGrid}>
          {item.sampleType && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🩸</Text>
              <Text style={styles.infoLabel}>Sample Type</Text>
              <Text style={styles.infoVal}>{item.sampleType}</Text>
            </View>
          )}

          {item.reportTime && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>⏱</Text>
              <Text style={styles.infoLabel}>Report Delivery</Text>
              <Text style={styles.infoVal}>{item.reportTime}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🏠</Text>
            <Text style={styles.infoLabel}>Collection Mode</Text>
            <Text style={styles.infoVal}>At Home</Text>
          </View>
        </View>

        <PhlebotomistGuaranteeCard style={styles.guaranteeCard} />

        {/* Fasting Advisory */}
        <View style={styles.advisoryCard}>
          <Text style={styles.advisoryIcon}>ℹ️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.advisoryTitle}>Fasting Instructions</Text>
            <Text style={styles.advisoryText}>
              Overnight 10-12 hours fasting is advised for lipid and glucose panels. Water is permitted.
            </Text>
          </View>
        </View>

        {/* Parameters Included */}
        {item.parameters && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parameters Included</Text>
            <View style={styles.paramBox}>
              <Text style={styles.paramText}>{item.parameters}</Text>
            </View>
          </View>
        )}

        {/* Partner Trust Assurance */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>DocNow Diagnostic Promise</Text>
          <Text style={styles.trustPoint}>✓ Digital reports accessible anytime in your health records</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Checkout Action */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total Price</Text>
          <Text style={styles.bottomPrice}>{formatRupees(price)}</Text>
        </View>

        {count > 0 ? (
          <View style={styles.actionButtonGroup}>
            <Pressable
              style={[styles.addFamilyBtn, adding && { opacity: 0.7 }]}
              disabled={adding}
              onPress={handleAddToCart}>
              {adding ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.addFamilyBtnText}>+ For Family</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.goToCartBtn}
              onPress={() => router.push('/(tabs)/tests')}>
              <Text style={styles.goToCartBtnText}>Go to Cart{count > 1 ? ` (${count})` : ''} ›</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.actionBtn, adding && { opacity: 0.7 }]}
            disabled={adding}
            onPress={handleAddToCart}>
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Add to Cart</Text>
            )}
          </Pressable>
        )}
      </View>
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
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  certBadge: {
    backgroundColor: Colors.tealTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  certBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.teal,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.foreground,
    lineHeight: 28,
  },
  desc: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: 8,
    lineHeight: 20,
  },
  priceCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.foreground,
  },
  mrp: {
    fontSize: 16,
    color: Colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    marginTop: 4,
  },
  guaranteeBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  guaranteeText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: 2,
    textAlign: 'center',
  },
  advisoryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.amberTint,
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  advisoryIcon: {
    fontSize: 18,
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
  },
  advisoryText: {
    fontSize: 12,
    color: Colors.foreground,
    marginTop: 2,
    lineHeight: 17,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 10,
  },
  paramBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  paramText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  trustSection: {
    marginTop: 20,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  trustPoint: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 20,
    marginBottom: 4,
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
  bottomPriceLabel: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cartIconBox: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconText: {
    fontSize: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFamilyBtn: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFamilyBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  goToCartBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goToCartBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  guaranteeCard: {
    marginTop: 16,
  },
});
