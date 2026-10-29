import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Home as HomeIcon,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DoctorCard } from '@/components/consult/doctor-card';
import { BookedForYouBanner } from '@/components/consult/family-access';
import { SpecialtyChips } from '@/components/consult/specialty-chips';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { AddressSheet } from '@/components/tests/address-sheet';
import { PackageCard } from '@/components/tests/package-card';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Colors, PrimaryGradient, Radius, Shadow, Type } from '@/constants/theme';
import { useServerNow } from '@/hooks/use-server-now';
import { useAuth } from '@/lib/auth';
import { consult, friendlyError } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';
import type { Specialty } from '@/lib/consult/types';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import { pickInitialAddress } from '@/lib/tests/address';
import { addressesApi, catalogApi } from '@/lib/tests/api';
import { useCart } from '@/lib/tests/cart-context';

const TOP_DOCTORS = 3;
const UPCOMING = ['CONFIRMED', 'WAITING', 'IN_PROGRESS'];

type Chip = { label: string } & ({ search: string } | { specialty: RegExp });
const QUICK_CHIPS: Chip[] = [
  { label: 'Fever', specialty: /general|physician|family|internal/ },
  { label: 'Full Body Checkup', search: 'Full Body' },
  { label: 'Dermatologist', specialty: /derma|skin/ },
  { label: 'Diabetes', search: 'Diabetes' },
];

const openDoctors = (specialty?: string) => router.push({ pathname: '/(tabs)/doctors', params: specialty ? { specialty } : {} });

function runChip(chip: Chip, specialties: Specialty[] | undefined) {
  hapticImpact(ImpactFeedbackStyle.Light);
  if ('search' in chip) {
    router.push({ pathname: '/tests/explore', params: { q: chip.search } });
    return;
  }
  // No matching specialty in this deployment: show every doctor rather than an empty list.
  const match = specialties?.find((s) => chip.specialty.test(`${s.slug} ${s.name}`.toLowerCase()));
  openDoctors(match?.id);
}

function IconButton({ label, onPress, badge, dot, children }: { label: string; onPress: () => void; badge?: number; dot?: boolean; children: React.ReactNode }) {
  return (
    <Pressable style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      {children}
      {badge ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : dot ? (
        <View style={styles.dotBadge} />
      ) : null}
    </Pressable>
  );
}

/** Where lab samples get picked up; choosing one here also becomes checkout's starting address. */
function LocationPill() {
  const queryClient = useQueryClient();
  const { preferredAddressId, setPreferredAddressId } = useCart();
  const [open, setOpen] = useState(false);
  const addresses = useQuery({ queryKey: ['profile', 'addresses'], queryFn: addressesApi.list, staleTime: 5 * 60_000 });
  const current = pickInitialAddress(addresses.data ?? [], preferredAddressId);
  const place = current ? [current.city, current.pincode].filter(Boolean).join(' ') : null;

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={place ? `Sample pickup at ${place}. Change address` : 'Add a sample pickup address'}>
        <MapPin size={18} color={Colors.primary} strokeWidth={2.4} />
        <View style={styles.flexShrink}>
          <Text style={styles.locationKicker}>Sample pickup at</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText} numberOfLines={1}>{place ?? 'Add address'}</Text>
            <ChevronDown size={16} color={Colors.foreground} strokeWidth={2.4} />
          </View>
        </View>
      </Pressable>
      <AddressSheet
        visible={open}
        selectedId={current?.id ?? null}
        onSelect={(a) => {
          setPreferredAddressId(a.id);
          setOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
        }}
        onClose={() => {
          setOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
        }}
      />
    </>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {action && onAction ? (
        <Pressable style={styles.sectionAction} onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={14} color={Colors.primary} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cartCount, refreshCart } = useCart();
  const now = useServerNow(60_000);

  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const doctors = useQuery({ queryKey: ['consult', 'doctors', null], queryFn: () => consult.doctors() });
  const packages = useQuery({
    queryKey: ['tests', 'featured', 'PACKAGE'],
    queryFn: () => catalogApi.featured({ type: 'PACKAGE', limit: 6 }),
    select: (res) => res?.products ?? [],
  });
  const bookings = useQuery({ queryKey: ['consult', 'bookings'], queryFn: consult.bookings, staleTime: 30_000 });

  const upcoming = (bookings.data ?? []).filter((b) => UPCOMING.includes(b.status) && Date.parse(b.endsAt) > now).length;
  const fees = (doctors.data ?? []).map((d) => d.consultationFee).filter((f) => f > 0);
  const doctorCount = doctors.data?.length ?? 0;
  const first = user?.name?.trim().split(/\s+/)[0];

  const refresh = () => {
    void specialties.refetch();
    void doctors.refetch();
    void packages.refetch();
    void bookings.refetch();
    void refreshCart();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LocationPill />
        <View style={styles.topActions}>
          <IconButton label={upcoming ? `My consultations, ${upcoming} upcoming` : 'My consultations'} onPress={() => router.push('/consult/my')} dot={upcoming > 0}>
            <Bell size={22} color={Colors.foreground} strokeWidth={2} />
          </IconButton>
          <IconButton label={cartCount ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart'} onPress={() => router.push('/(tabs)/tests')} badge={cartCount}>
            <ShoppingCart size={22} color={Colors.foreground} strokeWidth={2} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={doctors.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}>
        <View style={styles.hero}>
          <Text style={styles.greeting}>{first ? `Hello, ${first}` : 'Hello there'}</Text>
          <Text style={styles.headline}>How can we help you today?</Text>

          <Pressable
            style={({ pressed }) => [styles.search, pressed && styles.pressed]}
            onPress={() => router.push('/tests/explore')}
            accessibilityRole="search"
            accessibilityLabel="Search lab tests and health packages">
            <Search size={20} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.searchText} numberOfLines={1}>Search lab tests & health packages</Text>
          </Pressable>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {QUICK_CHIPS.map((c) => (
              <Pressable
                key={c.label}
                testID={`quick-${c.label}`}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                onPress={() => runChip(c, specialties.data)}
                accessibilityRole="button">
                <Text style={styles.chipText}>{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <BookedForYouBanner />

        <View style={styles.services}>
          <Pressable
            testID="service-consult"
            style={({ pressed }) => [styles.serviceWrap, pressed && styles.pressed]}
            onPress={() => openDoctors()}
            accessibilityRole="button"
            accessibilityLabel="Doctor consultation on video">
            <LinearGradient colors={PrimaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.service, Shadow.raised]}>
              <View style={styles.liveBadge}>
                <PulseDot color="#4ADE80" size={7} />
                <Text style={styles.liveText}>VIDEO</Text>
              </View>
              <View style={styles.serviceIconLight}>
                <Stethoscope size={26} color={Colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.serviceTitleLight}>Doctor Consult</Text>
              <Text style={styles.serviceSubLight} numberOfLines={2}>
                {doctorCount
                  ? `${doctorCount} verified ${doctorCount === 1 ? 'doctor' : 'doctors'}${fees.length ? ` · from ${formatRupees(Math.min(...fees))}` : ''}`
                  : 'Video call with verified doctors'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            testID="service-tests"
            style={({ pressed }) => [styles.serviceWrap, pressed && styles.pressed]}
            onPress={() => router.push('/tests/explore')}
            accessibilityRole="button"
            accessibilityLabel="Lab tests with home sample pickup">
            <View style={[styles.service, styles.serviceLight, Shadow.card]}>
              <View style={styles.homeBadge}>
                <HomeIcon size={11} color={Colors.teal} strokeWidth={2.6} />
                <Text style={styles.homeBadgeText}>AT HOME</Text>
              </View>
              <View style={styles.serviceIconTeal}>
                <FlaskConical size={26} color={Colors.teal} strokeWidth={2.2} />
              </View>
              <Text style={styles.serviceTitle}>Lab Tests at Home</Text>
              <Text style={styles.serviceSub} numberOfLines={2}>Sample pickup from your home</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.trust}>
          <View style={styles.trustItem}>
            <BadgeCheck size={15} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.trustText}>Certified Doctors</Text>
          </View>
          <View style={styles.trustItem}>
            <ShieldCheck size={15} color={Colors.primary} strokeWidth={2.4} />
            <Text style={styles.trustText}>NABL Accredited Labs</Text>
          </View>
        </View>

        {specialties.data && specialties.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Find Doctors by Specialty" action="See all" onAction={() => openDoctors()} />
            <SpecialtyChips specialties={specialties.data} value={null} onChange={(id) => openDoctors(id ?? undefined)} showAll={false} />
          </View>
        ) : null}

        {packages.data && packages.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Popular Health Packages" action="View all" onAction={() => router.push('/tests/explore')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {packages.data.map((p) => (
                <PackageCard key={p.id} item={p} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Top Doctors" action={doctorCount > TOP_DOCTORS ? `All ${doctorCount}` : undefined} onAction={() => openDoctors()} />
          <View style={styles.doctorList}>
            {doctors.isLoading ? <LoadingBlock label="Loading verified doctors..." /> : null}
            {doctors.error ? <ErrorState message={friendlyError(doctors.error)} onRetry={() => void doctors.refetch()} /> : null}
            {(doctors.data ?? []).slice(0, TOP_DOCTORS).map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
            {doctors.data && doctors.data.length === 0 ? <Text style={styles.empty}>No doctors are available right now. Please check back soon.</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  content: { paddingBottom: 32 },
  pressed: { opacity: 0.85 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.card },
  location: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minHeight: 44, paddingRight: 8 },
  locationKicker: { fontSize: 11, fontWeight: '600', color: Colors.mutedForeground },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationText: { fontSize: Type.body + 1, fontWeight: '800', color: Colors.foreground, flexShrink: 1 },
  topActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  countBadge: { position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.destructive, borderWidth: 2, borderColor: Colors.card },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dotBadge: { position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.destructive, borderWidth: 2, borderColor: Colors.card },

  hero: { gap: 10, paddingTop: 8, paddingBottom: 16, backgroundColor: Colors.card, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl },
  greeting: { paddingHorizontal: 16, fontSize: Type.body, fontWeight: '600', color: Colors.mutedForeground },
  headline: { paddingHorizontal: 16, fontSize: Type.hero, fontWeight: '800', color: Colors.foreground, marginTop: -6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
    backgroundColor: Colors.card,
    ...Shadow.raised,
    shadowOpacity: 0.1,
  },
  searchText: { flex: 1, fontSize: Type.body, color: Colors.mutedForeground },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primarySubtle, backgroundColor: Colors.primaryTint },
  chipPressed: { backgroundColor: Colors.primarySubtle },
  chipText: { fontSize: Type.caption + 1, fontWeight: '700', color: Colors.primary },

  services: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16 },
  serviceWrap: { flex: 1 },
  service: { flex: 1, minHeight: 164, padding: 14, gap: 4, borderRadius: Radius.xl, justifyContent: 'flex-end' },
  serviceLight: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.tealTint, borderTopWidth: 4, borderTopColor: Colors.teal },
  liveBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  homeBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.tealTint },
  homeBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.teal, letterSpacing: 0.6 },
  serviceIconLight: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: 8 },
  serviceIconTeal: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.tealTint, marginBottom: 8 },
  serviceTitleLight: { fontSize: Type.title + 1, fontWeight: '800', color: '#fff' },
  serviceSubLight: { fontSize: Type.caption, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 16 },
  serviceTitle: { fontSize: Type.title + 1, fontWeight: '800', color: Colors.foreground },
  serviceSub: { fontSize: Type.caption, color: Colors.mutedForeground, lineHeight: 16 },

  trust: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginHorizontal: 16, marginTop: 14, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: Type.caption, fontWeight: '700', color: Colors.primary },

  section: { marginTop: 24, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  sectionTitle: { fontSize: Type.title + 2, fontWeight: '800', color: Colors.foreground },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  sectionActionText: { fontSize: Type.caption + 1, fontWeight: '800', color: Colors.primary },
  carousel: { gap: 12, paddingHorizontal: 16, paddingBottom: 6 },
  doctorList: { gap: 12, paddingHorizontal: 16 },
  empty: { fontSize: Type.body, color: Colors.mutedForeground },
});
