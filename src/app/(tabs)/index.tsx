import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookedForYouBanner } from '@/components/consult/family-access';
import { DoctorCard } from '@/components/consult/doctor-card';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';
import { catalogApi } from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';
import type { CatalogItem } from '@/lib/tests/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { cartCount, refreshCart } = useCart();
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [featuredPackages, setFeaturedPackages] = useState<CatalogItem[]>([]);

  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const doctors = useQuery({
    queryKey: ['consult', 'doctors', specialtyId],
    queryFn: () => consult.doctors(specialtyId ?? undefined),
  });

  useEffect(() => {
    catalogApi.featured({ type: 'PACKAGE', limit: 4 }).then((res) => {
      setFeaturedPackages(res?.products || []);
    }).catch(() => {});
  }, []);

  const refresh = () => {
    void specialties.refetch();
    void doctors.refetch();
    void refreshCart();
  };

  const header = (
    <View style={styles.headerContainer}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>DN</Text>
          </View>
          <View>
            <Text style={styles.brandName}>DocNow</Text>
            <Text style={styles.brandTagline}>Healthcare delivered home</Text>
          </View>
        </View>

        <Pressable
          style={styles.cartIconBtn}
          onPress={() => router.push('/(tabs)/tests')}>
          <Text style={styles.cartIconText}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* A family member booked a consultation for this user: one tap to join. */}
      <BookedForYouBanner />

      {/* Universal Search Bar */}
      <Pressable
        style={styles.searchBar}
        onPress={() => router.push('/tests/explore')}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Search doctors, tests, packages, symptoms...</Text>
      </Pressable>

      {/* Hero 2-Action Cards Grid */}
      <View style={styles.heroGrid}>
        <Pressable
          style={[styles.heroCard, { backgroundColor: Colors.primary }]}
          onPress={() => {
            // Smoothly scrolls or highlights doctors section
          }}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>INSTANT</Text>
          </View>
          <Text style={styles.heroEmoji}>👨‍⚕️</Text>
          <Text style={styles.heroTitle}>Consult Doctor</Text>
          <Text style={styles.heroSub}>Video call in 15 mins</Text>
        </Pressable>

        <Pressable
          style={[styles.heroCard, { backgroundColor: '#38166D' }]}
          onPress={() => router.push('/tests/explore')}>
          <View style={[styles.heroBadge, { backgroundColor: Colors.teal }]}>
            <Text style={styles.heroBadgeText}>AT HOME</Text>
          </View>
          <Text style={styles.heroEmoji}>🧪</Text>
          <Text style={styles.heroTitle}>Book Lab Tests</Text>
          <Text style={styles.heroSub}>Sample pickup at home</Text>
        </Pressable>
      </View>

      {/* Trust Ticker */}
      <View style={styles.trustTicker}>
        <Text style={styles.trustText}>✓ 100% Certified Doctors</Text>
        <Text style={styles.trustDot}>•</Text>
        <Text style={styles.trustText}>NABL Accredited Labs</Text>
        <Text style={styles.trustDot}>•</Text>
        <Text style={styles.trustText}>Safe Home Sample Pickup</Text>
      </View>

      {/* Popular Health Packages Carousel */}
      {featuredPackages.length > 0 && (
        <View style={styles.packageSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Popular Health Packages</Text>
            <Pressable onPress={() => router.push('/tests/explore')}>
              <Text style={styles.viewAllText}>View All ›</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packageScroll}>
            {featuredPackages.map((pkg) => {
              const price = pkg.discountedPrice ?? pkg.displayPrice;
              return (
                <Pressable
                  key={pkg.id}
                  style={styles.packageCard}
                  onPress={() => router.push({ pathname: '/tests/[code]', params: { code: pkg.partnerCode } })}>
                  <View style={styles.pkgTop}>
                    <Text style={styles.pkgName} numberOfLines={1}>{pkg.name}</Text>
                    {pkg.parameters && (
                      <View style={styles.pkgParamBadge}>
                        <Text style={styles.pkgParamText}>{pkg.parameters}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.pkgDesc} numberOfLines={2}>{pkg.description || 'Comprehensive preventative full body health analysis.'}</Text>
                  <View style={styles.pkgFooter}>
                    <Text style={styles.pkgPrice}>{formatRupees(price)}</Text>
                    <View style={styles.bookSmallBtn}>
                      <Text style={styles.bookSmallText}>Book</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Specialty Filter Header */}
      <View style={styles.specialtySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Doctors by Specialty</Text>
          <Pressable onPress={() => router.push('/consult/my')}>
            <Text style={styles.viewAllText}>My Consultations ›</Text>
          </Pressable>
        </View>

        {specialties.data && specialties.data.length > 0 ? (
          <View style={styles.chipsWrap}>
            <SpecialtyChips specialties={specialties.data} value={specialtyId} onChange={setSpecialtyId} />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={doctors.isLoading || doctors.error ? [] : (doctors.data ?? [])}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <DoctorCard doctor={item} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.cardWrap}>
            {doctors.isLoading ? <LoadingBlock label="Loading verified doctors..." /> : null}
            {doctors.error ? <ErrorState message={friendlyError(doctors.error)} onRetry={() => void doctors.refetch()} /> : null}
            {!doctors.isLoading && !doctors.error ? (
              <EmptyState
                title="No doctors found"
                body={specialtyId ? 'No doctors are available for this specialty right now.' : 'No doctors are currently available. Please check back soon.'}
                action={
                  specialtyId ? (
                    <Pressable onPress={() => setSpecialtyId(null)}>
                      <Text style={styles.showAllLink}>Show all doctors</Text>
                    </Pressable>
                  ) : undefined
                }
              />
            ) : null}
          </View>
        }
        refreshControl={<RefreshControl refreshing={doctors.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
  },
  brandTagline: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  cartIconBtn: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: Colors.mutedForeground,
    flex: 1,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  heroCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: 16,
    position: 'relative',
    minHeight: 125,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  heroEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  trustTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 8,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  trustDot: {
    fontSize: 10,
    color: Colors.primary,
  },
  packageSection: {
    marginTop: 20,
    paddingLeft: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.foreground,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  packageScroll: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  packageCard: {
    width: 210,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  pkgTop: {
    marginBottom: 6,
  },
  pkgName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  pkgParamBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealTint,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  pkgParamText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.teal,
  },
  pkgDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 15,
  },
  pkgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.foreground,
  },
  bookSmallBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bookSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  specialtySection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  chipsWrap: {
    marginTop: 4,
  },
  cardWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  showAllLink: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
