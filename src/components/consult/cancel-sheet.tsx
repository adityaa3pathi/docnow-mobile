import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { formatPaise } from '@/lib/consult/format';
import type { CancelPreview, CancelResult } from '@/lib/consult/types';

interface Props {
  visible: boolean;
  bookingId: string;
  /** Unpaid bookings have nothing to refund, so no estimate is fetched. */
  unpaid: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

const REFUND_STATE: Record<NonNullable<CancelResult['refundStatus']>, string> = {
  PENDING: 'Your refund is on its way to your original payment method.',
  PROCESSED: 'Your refund has been sent to your original payment method.',
  FAILED: 'Your refund needs a manual step. Our team has been told and will sort it out.',
};

export function CancelSheet({ visible, bookingId, unpaid, onClose, onCancelled }: Props) {
  const [preview, setPreview] = useState<CancelPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancelResult | null>(null);
  // The list may refresh to a paid-looking state after cancel, so the wording is kept from the click.
  const [wasUnpaid, setWasUnpaid] = useState(false);

  useEffect(() => {
    if (!visible || unpaid || result) return;
    let alive = true;
    consult
      .cancelPreview(bookingId)
      .then((p) => {
        if (alive) {
          setPreview(p);
          setPreviewError(null);
        }
      })
      .catch((e) => alive && setPreviewError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [visible, unpaid, bookingId, result]);

  async function confirm() {
    setBusy(true);
    setError(null);
    setWasUnpaid(unpaid);
    try {
      setResult(await consult.cancel(bookingId, reason.trim() || undefined));
      onCancelled();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setResult(null);
    setPreview(null);
    setPreviewError(null);
    setReason('');
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          {result ? (
            <>
              <Text style={styles.title} accessibilityRole="header">Booking cancelled</Text>
              <Text style={styles.body}>
                {result.refundPaise > 0
                  ? `Refund: ${formatPaise(result.refundPaise)}.`
                  : wasUnpaid
                    ? 'The time was released. Nothing was charged.'
                    : 'No refund applies to this cancellation.'}
              </Text>
              {result.refundPaise > 0 && result.refundStatus ? (
                <Text style={styles.body} accessibilityLiveRegion="polite">{REFUND_STATE[result.refundStatus]}</Text>
              ) : null}
              <Pressable style={styles.primary} onPress={close} accessibilityRole="button" accessibilityLabel="Done">
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title} accessibilityRole="header">Cancel this booking?</Text>
              <Text style={styles.body}>{unpaid ? 'You have not paid yet, so nothing will be charged.' : 'This cannot be undone.'}</Text>
              {!unpaid ? (
                <View style={styles.preview} accessibilityLiveRegion="polite">
                  {preview ? (
                    <Text style={styles.body}>
                      About {formatPaise(preview.refundPaise)} will be refunded ({preview.percent}% of {formatPaise(preview.paidPaise)}). This is an estimate. You will see the final amount after cancelling.
                    </Text>
                  ) : null}
                  {!preview && !previewError ? <Text style={styles.body}>Checking your refund...</Text> : null}
                  {previewError ? <Text style={styles.error}>{previewError}</Text> : null}
                </View>
              ) : null}
              <Text style={styles.label}>Reason (optional)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                maxLength={200}
                multiline
                accessibilityLabel="Reason for cancelling, optional"
              />
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              <Pressable style={[styles.danger, busy && styles.disabled]} disabled={busy} onPress={confirm} accessibilityRole="button" accessibilityLabel="Cancel booking">
                {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>Cancel booking</Text>}
              </Pressable>
              <Pressable style={styles.secondary} disabled={busy} onPress={close} accessibilityRole="button" accessibilityLabel="Keep booking">
                <Text style={styles.secondaryText}>Keep booking</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { gap: 10, padding: 20, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  body: { color: Colors.foreground },
  label: { fontWeight: '600', color: Colors.foreground },
  preview: { padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  input: { minHeight: 80, padding: 12, borderWidth: 1, borderColor: Colors.muted, borderRadius: Radius.lg, fontSize: 16, color: Colors.foreground, textAlignVertical: 'top' },
  error: { color: Colors.destructive, fontWeight: '600' },
  primary: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700' },
  danger: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.destructive },
  secondary: { alignItems: 'center', padding: 14 },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
