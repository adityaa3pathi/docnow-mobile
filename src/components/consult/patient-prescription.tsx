import { useMutation, useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { PrescriptionView } from '@/components/consult/prescription-view';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { sharePdf } from '@/lib/consult/pdf';
import { notAPdfMessage } from '@/lib/consult/pdfBytes';
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
      {pdf.error ? <Notice tone="error">{notAPdfMessage(pdf.error) ?? friendlyError(pdf.error, PDF_FAILED)}</Notice> : null}
      {p.recommendedTests.length > 0 ? (
        <ActionButton label="Add recommended tests to cart" busyLabel="Adding..." busy={cart.isPending} disabled={busy} onPress={() => cart.mutate()} />
      ) : null}
      {cart.error ? <Notice tone="error">{friendlyError(cart.error)}</Notice> : null}
      {cart.data ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          {cartLines(cart.data, p.recommendedTests).map((line) => <Text key={line} style={styles.resultText}>{line}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Space[4], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  title: { ...Type.titleSm, color: Colors.ink },
  result: { gap: Space[1], padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  resultText: { ...Type.small, color: Colors.successInk },
});
