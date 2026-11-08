import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Shadow, Space, Type } from '@/constants/theme';
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
              <ActionButton label="Done" onPress={close} />
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
                  {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
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
              {error ? <Notice tone="error">{error}</Notice> : null}
              <ActionButton label="Cancel booking" busyLabel="Cancelling..." variant="danger" busy={busy} onPress={confirm} />
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
  sheet: { gap: Space[3], padding: Space[6], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadow.raised },
  title: { ...Type.titleSm, color: Colors.ink },
  body: { ...Type.body, color: Colors.ink },
  label: { ...Type.bodyStrong, color: Colors.ink },
  preview: { padding: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  input: { ...Type.body, minHeight: 80, padding: Space[3], borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.md, color: Colors.ink, textAlignVertical: 'top' },
  errorText: { ...Type.small, color: Colors.dangerInk },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
