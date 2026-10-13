import { useMutation, useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { PrescriptionView } from '@/components/consult/prescription-view';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { sharePdf } from '@/lib/consult/pdf';
import { cartLines } from '@/lib/consult/roomText';

const PDF_FAILED = 'We could not download the prescription. Please try again.';

export function PatientPrescription({ bookingId }: { bookingId: string }) {
  const q = useQuery({ queryKey: ['consult', 'prescription', bookingId], queryFn: () => consult.prescription(bookingId), staleTime: 0 });
  const pdf = useMutation({
    mutationFn: async () => sharePdf(await consult.prescriptionPdf(bookingId), `docnow-prescription-${bookingId.slice(0, 8)}.pdf`),
  });
  const cart = useMutation({ mutationFn: () => consult.addTestsToCart(bookingId) });
  const busy = pdf.isPending || cart.isPending;

  if (q.isLoading) return <LoadingBlock label="Loading your prescription" />;
  if (!q.data) return <ErrorState message={friendlyError(q.error, 'We could not load your prescription.')} onRetry={() => void q.refetch()} />;
  const p = q.data;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">Your prescription</Text>
      <PrescriptionView prescription={p} />
      <ActionButton label="Download prescription (PDF)" busyLabel="Downloading..." variant="soft" busy={pdf.isPending} disabled={busy} onPress={() => pdf.mutate()} />
      {pdf.error ? <Text style={styles.error} accessibilityRole="alert">{friendlyError(pdf.error, PDF_FAILED)}</Text> : null}
      {p.recommendedTests.length > 0 ? (
        <ActionButton label="Add recommended tests to cart" busyLabel="Adding..." busy={cart.isPending} disabled={busy} onPress={() => cart.mutate()} />
      ) : null}
      {cart.error ? <Text style={styles.error} accessibilityRole="alert">{friendlyError(cart.error)}</Text> : null}
      {cart.data ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          {cartLines(cart.data, p.recommendedTests).map((line) => <Text key={line} style={styles.resultText}>{line}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  error: { color: Colors.destructive, fontWeight: '600' },
  result: { gap: 4, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  resultText: { color: Colors.foreground, fontWeight: '600' },
});
