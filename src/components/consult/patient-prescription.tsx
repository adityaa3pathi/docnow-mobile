import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { ALREADY_IN_CART, cartFunnel } from '@/lib/consult/recommendedTests';
import type { CartAddResult } from '@/lib/consult/types';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { useCart } from '@/lib/tests/cart-context';
import { PrescriptionView } from './prescription-view';
import { ErrorState, LoadingBlock } from './states';

interface Props {
  bookingId: string;
}

export function PatientPrescription({ bookingId }: Props) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['consult', 'prescription', bookingId],
    queryFn: () => consult.prescription(bookingId),
  });

  const [busyAction, setBusyAction] = useState<'pdf' | 'cart' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cartResult, setCartResult] = useState<CartAddResult | null>(null);
  const { refreshCart } = useCart();

  async function openPdf() {
    setBusyAction('pdf');
    setActionError(null);
    try {
      // A signed link: the browser cannot send the sign-in header the plain PDF route needs.
      const url = await consult.prescriptionLink(bookingId);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setActionError(friendlyError(e, 'Could not open prescription PDF.'));
    } finally {
      setBusyAction(null);
    }
  }

  async function addTests() {
    setBusyAction('cart');
    setActionError(null);
    try {
      const res = await consult.addTestsToCart(bookingId);
      // The header badge, cart tab and floating bar all read the shared cart, so sync it now.
      await refreshCart();
      setCartResult(res);
      const placed = res.added.length > 0 || res.skipped.some((s) => s.reason === ALREADY_IN_CART);
      hapticNotify(placed ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning);
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setActionError(friendlyError(e, 'Could not add tests to cart.'));
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading) return <LoadingBlock label="Loading your prescription" />;
  if (error || !data) {
    return <ErrorState message={error ? friendlyError(error) : 'We could not load your prescription.'} onRetry={() => void refetch()} />;
  }

  const hasTests = data.recommendedTests && data.recommendedTests.length > 0;
  const funnel = cartResult ? cartFunnel(cartResult, data.recommendedTests) : null;
  const inCart = funnel?.cta != null;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">Your Prescription</Text>
      <PrescriptionView prescription={data} />

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.outlineButton, busyAction !== null && styles.disabled]}
          disabled={busyAction !== null}
          onPress={openPdf}
          accessibilityRole="button"
          accessibilityLabel="Download prescription PDF">
          {busyAction === 'pdf' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.outlineText}>Download PDF</Text>
          )}
        </Pressable>

        {hasTests ? (
          <Pressable
            style={[styles.primaryButton, (busyAction !== null || inCart) && styles.disabled]}
            disabled={busyAction !== null || inCart}
            onPress={addTests}
            testID="rx-book-all"
            accessibilityRole="button"
            accessibilityLabel={inCart ? 'Recommended tests are in your cart' : 'Add recommended tests to cart'}>
            {busyAction === 'cart' ? (
              <ActivityIndicator size="small" color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryText}>{inCart ? '✓ In Cart' : 'Book All Tests'}</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {actionError ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      {funnel ? (
        <View style={[styles.funnel, !funnel.cta && styles.funnelMuted]} accessibilityLiveRegion="polite" testID="rx-cart-funnel">
          <Text style={[styles.funnelHeadline, !funnel.cta && styles.funnelHeadlineMuted]} accessibilityRole="header">
            {funnel.headline}
          </Text>
          {funnel.added.length || funnel.alreadyInCart.length ? (
            <View style={styles.pills}>
              {funnel.added.map((t) => (
                <View key={t.code} style={styles.pill}>
                  <Text style={styles.pillText}>{t.name}</Text>
                </View>
              ))}
              {funnel.alreadyInCart.map((t) => (
                <View key={t.code} style={[styles.pill, styles.pillMuted]}>
                  <Text style={[styles.pillText, styles.pillTextMuted]}>{t.name} · in cart</Text>
                </View>
              ))}
            </View>
          ) : null}
          {funnel.unavailable.map(({ test, reason }) => (
            <Text key={test.code} style={styles.cartSkipped}>
              {test.name}: {reason}
            </Text>
          ))}
          {funnel.cta ? (
            <Pressable
              style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
              testID="rx-cart-cta"
              onPress={() => {
                hapticImpact(ImpactFeedbackStyle.Medium);
                router.push(funnel.cta!.href);
              }}
              accessibilityRole="button"
              accessibilityLabel={funnel.cta.label.replace(' →', '')}>
              <Text style={styles.ctaText}>{funnel.cta.label}</Text>
            </Pressable>
          ) : null}
          {funnel.cta ? <Text style={styles.ctaHint}>Free home sample collection by certified phlebotomists</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.muted,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: Colors.primaryForeground,
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  errorBox: {
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  funnel: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryTint,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
    gap: 12,
  },
  funnelMuted: {
    backgroundColor: Colors.cardMuted,
    borderColor: Colors.border,
  },
  funnelHeadline: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  funnelHeadlineMuted: {
    color: Colors.foreground,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
  },
  pillMuted: {
    borderColor: Colors.border,
  },
  pillText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  pillTextMuted: {
    color: Colors.mutedForeground,
  },
  ctaButton: {
    minHeight: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: Colors.primaryForeground,
    fontWeight: '800',
    fontSize: 15,
  },
  ctaHint: {
    color: Colors.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
  },
  cartSkipped: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
});
