import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { LoadingBlock } from '@/components/consult/states';
import { Colors, Radius, Shadow, Space, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { lab } from '@/lib/lab/api';
import { formatSlotDate, istDayKeyPlus } from '@/lib/lab/bookings';
import { RESCHEDULE_REASON_MIN } from '@/lib/lab/slots';
import type { LabSlot } from '@/lib/lab/types';

interface Props {
    visible: boolean;
    bookingId: string;
    onClose: () => void;
    onRescheduled: () => void;
}

/** The lab partner takes bookings from tomorrow onwards, which is what the website offers too. */
const DAYS_AHEAD = 7;

export function LabRescheduleSheet({ visible, bookingId, onClose, onRescheduled }: Props) {
    const days = useMemo(
        () => Array.from({ length: DAYS_AHEAD }, (_, i) => istDayKeyPlus(i + 1)),
        [],
    );
    const [date, setDate] = useState(days[0]);
    const [slot, setSlot] = useState<LabSlot | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const slots = useQuery({
        queryKey: ['lab', 'slots', bookingId, date],
        queryFn: () => lab.slots(bookingId, date),
        enabled: visible,
        staleTime: 60_000,
    });

    const ready = Boolean(slot) && reason.trim().length >= RESCHEDULE_REASON_MIN;

    function pickDay(day: string) {
        setDate(day);
        setSlot(null);
    }

    async function confirm() {
        if (!slot) return;
        setBusy(true);
        setError(null);
        try {
            await lab.reschedule(bookingId, slot, date, reason.trim());
            onRescheduled();
            close();
        } catch (e) {
            setError(friendlyError(e));
        } finally {
            setBusy(false);
        }
    }

    function close() {
        if (busy) return;
        setSlot(null);
        setReason('');
        setError(null);
        onClose();
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.sheet}>
                    <Text style={styles.title} accessibilityRole="header">Pick a new slot</Text>
                    <Text style={styles.body}>Choose a new date and time for your sample collection.</Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.days}
                        accessibilityLabel="Choose a date">
                        {days.map((day) => {
                            const on = day === date;
                            return (
                                <Pressable
                                    key={day}
                                    onPress={() => pickDay(day)}
                                    accessibilityRole="tab"
                                    accessibilityLabel={formatSlotDate(day)}
                                    accessibilityState={{ selected: on }}
                                    style={[styles.day, on && styles.on]}>
                                    <Text style={[styles.dayText, on && styles.onText]}>{formatSlotDate(day)}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <ScrollView style={styles.slotScroll}>
                        {slots.isLoading ? <LoadingBlock label="Checking available slots" /> : null}
                        {slots.error ? <Notice tone="error">{friendlyError(slots.error)}</Notice> : null}
                        {slots.data?.length === 0 ? <Text style={styles.body}>No slots are available on this date.</Text> : null}
                        <View style={styles.grid} accessibilityLabel={`Times on ${formatSlotDate(date)}, Indian time`}>
                            {(slots.data ?? []).map((option) => {
                                const checked = option.id === slot?.id;
                                return (
                                    <Pressable
                                        key={option.id}
                                        onPress={() => setSlot(option)}
                                        accessibilityRole="radio"
                                        accessibilityLabel={`${option.label}, ${formatSlotDate(date)}`}
                                        accessibilityState={{ checked }}
                                        style={[styles.slot, checked && styles.on]}>
                                        <Text style={[styles.slotText, checked && styles.onText]}>{option.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <Text style={styles.label}>Reason for rescheduling</Text>
                    <TextInput
                        style={styles.input}
                        value={reason}
                        onChangeText={setReason}
                        maxLength={200}
                        placeholder={`Please give a reason, at least ${RESCHEDULE_REASON_MIN} characters`}
                        placeholderTextColor={Colors.inkSubtle}
                        accessibilityLabel="Reason for rescheduling"
                        accessibilityHint={`At least ${RESCHEDULE_REASON_MIN} characters`}
                    />
                    {error ? <Notice tone="error">{error}</Notice> : null}
                    <ActionButton label="Reschedule" busyLabel="Updating..." busy={busy} disabled={!ready} onPress={confirm} />
                    <Pressable
                        style={styles.secondary}
                        disabled={busy}
                        onPress={close}
                        accessibilityRole="button"
                        accessibilityLabel="Keep current slot">
                        <Text style={styles.secondaryText}>Keep current slot</Text>
                    </Pressable>
                    <Text style={styles.note}>All times are Indian time.</Text>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
    sheet: { gap: Space[3], padding: Space[6], maxHeight: '90%', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadow.raised },
    title: { ...Type.titleSm, color: Colors.ink },
    body: { ...Type.body, color: Colors.ink },
    label: { ...Type.bodyStrong, color: Colors.ink },
    days: { gap: Space[2] },
    day: { justifyContent: 'center', minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
    dayText: { ...Type.bodyStrong, color: Colors.ink },
    slotScroll: { maxHeight: 180 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
    slot: { minWidth: 120, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
    slotText: { ...Type.bodyStrong, color: Colors.ink, fontVariant: ['tabular-nums'] },
    on: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    onText: { color: Colors.onPrimary },
    input: { ...Type.body, minHeight: 44, padding: Space[3], borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.md, color: Colors.ink },
    secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
    note: { ...Type.small, color: Colors.inkMuted },
});
