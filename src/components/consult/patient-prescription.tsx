import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import type { CartAddResult } from '@/lib/consult/types';
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

  async function openPdf() {
    setBusyAction('pdf');
    setActionError(null);
    try {
      const url = consult.prescriptionPdfUrl(bookingId);
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
      setCartResult(res);
    } catch (e) {
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
            style={[styles.primaryButton, busyAction !== null && styles.disabled]}
            disabled={busyAction !== null}
            onPress={addTests}
            accessibilityRole="button"
            accessibilityLabel="Add recommended tests to cart">
            {busyAction === 'cart' ? (
              <ActivityIndicator size="small" color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryText}>Book All Tests</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {actionError ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      ) : null}

      {cartResult ? (
        <View style={styles.cartBox} accessibilityLiveRegion="polite">
          {cartResult.added.length > 0 ? (
            <Text style={styles.cartSuccess}>
              Tests added to cart: {cartResult.added.join(', ')}
            </Text>
          ) : null}
          {cartResult.skipped.map((s) => (
            <Text key={s.code} style={styles.cartSkipped}>
              {s.code}: {s.reason}
            </Text>
          ))}
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
  cartBox: {
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    gap: 4,
  },
  cartSuccess: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  cartSkipped: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
});
