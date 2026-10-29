import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorRetryState } from '@/components/tests/empty-state';
import { TestCardSkeleton } from '@/components/tests/test-card-skeleton';
import { AccreditationBanner } from '@/components/tests/trust-badges';
import { Colors, Radius } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import { catalogApi } from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { CatalogCategory, CatalogItem } from '@/lib/tests/types';

const TYPES = [
  { label: 'All', value: '' },
  { label: 'Packages', value: 'PACKAGE' },
  { label: 'Single Tests', value: 'TEST' },
  { label: 'Profiles', value: 'PROFILE' },
];

export default function ExploreTestsScreen() {
  const insets = useSafeAreaInsets();
  const { cartCount, addToCart, getItemCount } = useCart();
  // Home's quick chips ("Full Body Checkup", "Diabetes") open this screen pre-searched.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(q ?? '');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingCode, setAddingCode] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    catalogApi.categories().then(setCategories).catch(() => {});
  }, []);

  // Fetch products with search/type/category filter
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setLoadFailed(false);
        const res = await catalogApi.products({
          search: search.trim() || undefined,
          type: selectedType || undefined,
          category: selectedCategory || undefined,
          limit: 30,
        });
        if (!cancelled) {
          setProducts(res.products || []);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, selectedType, selectedCategory, reloadKey]);

  const handleAddToCart = async (item: CatalogItem) => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    try {
      setAddingCode(item.partnerCode);
      await addToCart(item.partnerCode);
    } catch {
      // Handled
    } finally {
      setAddingCode(null);
    }
  };

  const renderProduct = ({ item }: { item: CatalogItem }) => {
    const isAdding = addingCode === item.partnerCode;
    const count = getItemCount(item.partnerCode);
    const price = item.discountedPrice ?? item.displayPrice;
    const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.displayPrice;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: '/tests/[code]', params: { code: item.partnerCode } })}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          {item.parameters && (
            <View style={styles.paramBadge}>
              <Text style={styles.paramBadgeText}>{item.parameters}</Text>
            </View>
          )}
        </View>

        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>

        {item.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {item.sampleType && (
            <Text style={styles.metaText}>🩸 {item.sampleType}</Text>
          )}
          {item.reportTime && (
            <Text style={styles.metaText}>⏱ {item.reportTime}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{formatRupees(price)}</Text>
            {hasDiscount && (
              <Text style={styles.mrpText}>{formatRupees(item.displayPrice)}</Text>
            )}
          </View>

          {count > 0 ? (
            <View style={styles.actionButtonGroup}>
              <View style={styles.addedBadge}>
                <Text style={styles.addedBadgeText}>✓ Added{count > 1 ? ` (${count})` : ''}</Text>
              </View>
              <Pressable
                style={[styles.addFamilyBtn, isAdding && styles.addBtnDisabled]}
                disabled={isAdding}
                hitSlop={5}
                onPress={() => handleAddToCart(item)}>
                {isAdding ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Text style={styles.addFamilyBtnText}>+ For Family</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.addBtn, isAdding && styles.addBtnDisabled]}
              disabled={isAdding}
              onPress={() => handleAddToCart(item)}>
              {isAdding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addBtnText}>+ Add</Text>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Lab Tests & Packages</Text>
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

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by test name, illness, or organ..."
          placeholderTextColor={Colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type Filter Pills */}
      <View style={styles.typeRow}>
        {TYPES.map((t) => {
          const isActive = selectedType === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setSelectedType(t.value)}
              style={[styles.typePill, isActive && styles.typePillActive]}>
              <Text style={[styles.typePillText, isActive && styles.typePillTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Category Horizontal Filter */}
      {categories.length > 0 && (
        <View style={styles.catWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', name: 'All Categories', slug: '' }, ...categories]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.slug;
              return (
                <Pressable
                  onPress={() => setSelectedCategory(item.slug)}
                  style={[styles.catPill, isActive && styles.catPillActive]}>
                  <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <AccreditationBanner />

      {/* Product List */}
      {loading ? (
        <View style={styles.listContent}>
          {[0, 1, 2, 3].map((i) => (
            <TestCardSkeleton key={i} />
          ))}
        </View>
      ) : loadFailed ? (
        <ErrorRetryState
          title="Couldn’t load lab tests"
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No tests matching your query"
          subtitle="Try checking for generic test names like CBC, Thyroid, or Vitamin D"
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedType('');
            setSelectedCategory('');
          }}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <View style={[styles.floatingCart, { bottom: Math.max(insets.bottom, 16) }]}>
          <View>
            <Text style={styles.floatingCount}>{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart</Text>
            <Text style={styles.floatingSub}>Sample collection at home</Text>
          </View>
          <Pressable
            style={styles.floatingBtn}
            onPress={() => router.push('/(tabs)/tests')}>
            <Text style={styles.floatingBtnText}>View Cart ›</Text>
          </Pressable>
        </View>
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
  cartIconBox: {
    position: 'relative',
    padding: 6,
  },
  cartIconText: {
    fontSize: 22,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.card,
  },
  searchInput: {
    backgroundColor: Colors.cardMuted,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    gap: 8,
  },
  typePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: Colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  typePillTextActive: {
    color: '#fff',
  },
  catWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardMuted,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.foreground,
  },
  catPillTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  paramBadge: {
    backgroundColor: Colors.tealTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  paramBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.teal,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    lineHeight: 22,
  },
  productDesc: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
  },
  mrpText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.7,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addedBadge: {
    backgroundColor: '#EDFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  addedBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  addFamilyBtn: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFamilyBtnText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  floatingCart: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingCount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  floatingSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  floatingBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  floatingBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
