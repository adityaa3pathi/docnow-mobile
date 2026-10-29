import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorCard } from '@/components/consult/doctor-card';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { LoadingBlock } from '@/components/consult/states';
import { EmptyState, ErrorRetryState } from '@/components/tests/empty-state';
import { TestCardSkeleton } from '@/components/tests/test-card-skeleton';
import { AccreditationBanner } from '@/components/tests/trust-badges';
import { Colors, Radius } from '@/constants/theme';
import { consult } from '@/lib/consult/api';
import { searchDoctors } from '@/lib/consult/doctorSearch';
import { formatRupees } from '@/lib/consult/format';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import { catalogApi } from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { CatalogCategory, CatalogItem } from '@/lib/tests/types';

type Segment = 'all' | 'doctors' | 'tests';
const SEGMENTS: { label: string; value: Segment }[] = [
  { label: 'All', value: 'all' },
  { label: 'Doctors', value: 'doctors' },
  { label: 'Lab Tests', value: 'tests' },
];
/** How many doctors "All" shows before "View all". */
const ALL_DOCTORS_PREVIEW = 3;

const TYPES = [
  { label: 'All', value: '' },
  { label: 'Packages', value: 'PACKAGE' },
  { label: 'Single Tests', value: 'TEST' },
  { label: 'Profiles', value: 'PROFILE' },
];

export default function ExploreTestsScreen() {
  const insets = useSafeAreaInsets();
  const { cartCount, addToCart, getItemCount } = useCart();
  // Home's quick chips ("Full Body Checkup", "Diabetes") open this screen pre-searched; lab-test
  // screens open it on the Lab Tests segment.
  const params = useLocalSearchParams<{ q?: string; segment?: string }>();
  const [search, setSearch] = useState(params.q ?? '');
  const [segment, setSegment] = useState<Segment>(params.segment === 'doctors' || params.segment === 'tests' ? params.segment : 'all');
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingCode, setAddingCode] = useState<string | null>(null);

  const doctors = useQuery({ queryKey: ['consult', 'doctors', null], queryFn: () => consult.doctors() });
  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const matchedDoctors = searchDoctors(doctors.data ?? [], search, segment === 'doctors' ? specialtyId : null);

  // Type and category filters belong to the Lab Tests segment; "All" searches the whole catalog.
  const productType = segment === 'tests' ? selectedType : '';
  const productCategory = segment === 'tests' ? selectedCategory : '';

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
          type: productType || undefined,
          category: productCategory || undefined,
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
  }, [search, productType, productCategory, reloadKey]);

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
        key={item.id}
        testID={`product-${item.partnerCode}`}
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
                testID={`product-add-${item.partnerCode}`}
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
              testID={`product-add-${item.partnerCode}`}
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
        <Text style={styles.headerTitle}>Search</Text>
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
          testID="search-input"
          style={styles.searchInput}
          placeholder={segment === 'tests' ? 'Search by test name, illness, or organ...' : 'Search doctors, specialties, symptoms or tests'}
          placeholderTextColor={Colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          accessibilityLabel="Search"
        />
      </View>

      <View style={styles.segmentRow} accessibilityRole="tablist">
        {SEGMENTS.map((sg) => {
          const active = segment === sg.value;
          return (
            <Pressable
              key={sg.value}
              testID={`segment-${sg.value}`}
              onPress={() => setSegment(sg.value)}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              aria-selected={active}
              accessibilityState={{ selected: active }}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{sg.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {segment === 'tests' ? (
        <>
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
        </>
      ) : segment === 'doctors' ? (
        <FlatList
          data={doctors.isLoading || doctors.error ? [] : matchedDoctors}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.doctorsHead}>
              {specialties.data && specialties.data.length > 0 ? (
                <View style={styles.bleed}>
                  <SpecialtyChips specialties={specialties.data} value={specialtyId} onChange={setSpecialtyId} />
                </View>
              ) : null}
              {matchedDoctors.length > 0 ? (
                <Text style={styles.sectionTitle} testID="section-doctors">Doctors ({matchedDoctors.length})</Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.doctorWrap} testID={`search-doctor-${item.id}`}>
              <DoctorCard doctor={item} />
            </View>
          )}
          ListEmptyComponent={
            doctors.isLoading ? (
              <LoadingBlock label="Loading verified doctors..." />
            ) : doctors.error ? (
              <ErrorRetryState title="Couldn’t load doctors" onRetry={() => void doctors.refetch()} />
            ) : (
              <EmptyState
              icon="🩺"
              title="No doctors match your search"
              subtitle="Try a specialty like Dermatology, or a symptom like fever or acne"
              actionLabel={specialtyId ? 'Show all specialties' : 'Clear search'}
              onAction={() => (specialtyId ? setSpecialtyId(null) : setSearch(''))}
            />
            )
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          {matchedDoctors.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle} testID="section-doctors">Doctors ({matchedDoctors.length})</Text>
                {matchedDoctors.length > ALL_DOCTORS_PREVIEW ? (
                  <Pressable testID="view-all-doctors" onPress={() => setSegment('doctors')} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.viewAll}>View all ›</Text>
                  </Pressable>
                ) : null}
              </View>
              {matchedDoctors.slice(0, ALL_DOCTORS_PREVIEW).map((d) => (
                <View key={d.id} style={styles.doctorWrap} testID={`search-doctor-${d.id}`}>
                  <DoctorCard doctor={d} />
                </View>
              ))}
            </View>
          ) : null}

          {loading ? (
            <View style={styles.section}>
              {[0, 1].map((i) => (
                <TestCardSkeleton key={i} />
              ))}
            </View>
          ) : products.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle} testID="section-tests">Lab Tests & Packages ({products.length})</Text>
                <Pressable testID="view-all-tests" onPress={() => setSegment('tests')} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.viewAll}>Filters ›</Text>
                </Pressable>
              </View>
              {products.map((item) => renderProduct({ item }))}
            </View>
          ) : null}

          {!loading && !doctors.isLoading && products.length === 0 && matchedDoctors.length === 0 ? (
            loadFailed ? (
              <ErrorRetryState title="Couldn’t load results" onRetry={() => setReloadKey((k) => k + 1)} />
            ) : (
              <EmptyState
                icon="🔍"
                title={search.trim() ? `No results for “${search.trim()}”` : 'Nothing to show yet'}
                subtitle="Try a doctor’s name, a specialty, a symptom like fever, or a test like CBC or Thyroid"
                actionLabel="Clear Search"
                onAction={() => setSearch('')}
              />
            )
          ) : null}
        </ScrollView>
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
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    gap: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardMuted,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  segmentActive: {
    backgroundColor: Colors.card,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  section: {
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.foreground,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  doctorsHead: {
    gap: 12,
    marginBottom: 12,
  },
  bleed: {
    marginHorizontal: -16,
  },
  doctorWrap: {
    marginBottom: 12,
  },
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
