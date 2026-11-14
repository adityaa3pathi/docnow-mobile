import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Shadow, Space, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { lab } from '@/lib/lab/api';
import { CANCEL_REASON_MIN } from '@/lib/lab/slots';
import type { CancelLabResult } from '@/lib/lab/types';

interface Props {
    visible: boolean;
    bookingId: string;
    onClose: () => void;
    onCancelled: () => void;
}

const MANUAL_REFUND_NOTE = 'Our team has been told and will finish your refund by hand.';

export function LabCancelSheet({ visible, bookingId, onClose, onCancelled }: Props) {
    const [remarks, setRemarks] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CancelLabResult | null>(null);
    const ready = remarks.trim().length >= CANCEL_REASON_MIN;

    async function confirm() {
        setBusy(true);
        setError(null);
        try {
            setResult(await lab.cancel(bookingId, remarks.trim()));
            onCancelled();
        } catch (e) {
            setError(friendlyError(e));
        } finally {
            setBusy(false);
        }
    }

    function close() {
        if (busy) return;
        setRemarks('');
        setError(null);
        setResult(null);
        onClose();
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.sheet}>
                    {result ? (
                        <>
                            <Text style={styles.title} accessibilityRole="header">Booking cancelled</Text>
                            {/* The server decides the refund, so its own sentence is what the user reads. */}
                            <Text style={styles.body} accessibilityLiveRegion="polite">{result.message}</Text>
                            {result.manualRefundRequired ? <Text style={styles.body}>{MANUAL_REFUND_NOTE}</Text> : null}
                            <ActionButton label="Done" onPress={close} />
                        </>
                    ) : (
                        <>
                            <Text style={styles.title} accessibilityRole="header">Cancel this booking?</Text>
                            <Text style={styles.body}>
                                Are you sure you want to cancel this booking? This cannot be undone.
                            </Text>
                            <Text style={styles.label}>Reason for cancellation</Text>
                            <TextInput
                                style={styles.input}
                                value={remarks}
                                onChangeText={setRemarks}
                                maxLength={200}
                                multiline
                                placeholder={`Please give a reason, at least ${CANCEL_REASON_MIN} characters`}
                                placeholderTextColor={Colors.inkSubtle}
                                accessibilityLabel="Reason for cancellation"
                                accessibilityHint={`At least ${CANCEL_REASON_MIN} characters`}
                            />
                            {error ? <Notice tone="error">{error}</Notice> : null}
                            <ActionButton
                                label="Confirm cancellation"
                                busyLabel="Cancelling..."
                                variant="danger"
                                busy={busy}
                                disabled={!ready}
                                onPress={confirm}
                            />
                            <Pressable
                                style={styles.secondary}
                                disabled={busy}
                                onPress={close}
                                accessibilityRole="button"
                                accessibilityLabel="Keep booking">
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
    input: { ...Type.body, minHeight: 80, padding: Space[3], borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.md, color: Colors.ink, textAlignVertical: 'top' },
    secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
