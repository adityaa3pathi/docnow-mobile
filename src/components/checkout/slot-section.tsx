import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { formatCountdown, HOLD_NOTE, holdAnnouncement, holdMessage, lockButtonView, type HoldLevel } from '@/lib/checkout';
import { formatSlotDate } from '@/lib/lab/bookings';
import type { LabSlot } from '@/lib/lab/types';

import { Section } from './section';

interface Props {
    days: string[];
    date: string;
    onDate: (date: string) => void;
    slots: LabSlot[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    slot: LabSlot | null;
    onSlot: (slot: LabSlot) => void;
    locked: boolean;
    freezing: boolean;
    secondsRemaining: number;
    level: HoldLevel;
    onLock: () => void;
    notice: string | null;
}

export function SlotSection({
    days,
    date,
    onDate,
    slots,
    loading,
    error,
    onRetry,
    slot,
    onSlot,
    locked,
    freezing,
    secondsRemaining,
    level,
    onLock,
    notice,
}: Props) {
    const button = lockButtonView(Boolean(slot), freezing, locked);
    const banner = holdMessage(level, secondsRemaining);

    return (
        <Section step={2} title="Collection date and time">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days} accessibilityLabel="Choose a date">
                {days.map((day) => {
                    const on = day === date;
                    return (
                        <Pressable
                            key={day}
                            onPress={() => onDate(day)}
                            accessibilityRole="tab"
                            accessibilityLabel={formatSlotDate(day)}
                            accessibilityState={{ selected: on }}
                            style={[styles.day, on && styles.on]}>
                            <Text style={[styles.dayText, on && styles.onText]}>{formatSlotDate(day)}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {loading ? <LoadingBlock label="Checking available slots" /> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            {error ? (
                <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try loading slots again" style={styles.retry}>
                    <Text style={styles.retryText}>Try again</Text>
                </Pressable>
            ) : null}
            {!loading && !error && slots.length === 0 ? (
                <Text style={styles.muted}>No slots are open on this date. Please try another date.</Text>
            ) : null}

            {slots.length > 0 ? (
                <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={`Times on ${formatSlotDate(date)}, Indian time`}>
                    {slots.map((option) => {
                        const checked = option.id === slot?.id;
                        const off = locked && !checked;
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() => onSlot(option)}
                                disabled={off}
                                accessibilityRole="radio"
                                accessibilityLabel={`${option.label}, ${formatSlotDate(date)}`}
                                accessibilityState={{ checked, disabled: off }}
                                style={[styles.slot, checked && styles.on, off && styles.dim]}>
                                <Text style={[styles.slotText, checked && styles.onText]}>{option.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}

            {banner ? (
                <View style={[styles.banner, level === 'urgent' ? styles.urgent : level === 'warning' ? styles.warning : styles.normal]}>
                    <Text style={[styles.bannerText, level === 'urgent' && styles.urgentText]}>{banner}</Text>
                    <Text style={[styles.clock, level === 'urgent' && styles.urgentText]}>{formatCountdown(secondsRemaining)}</Text>
                </View>
            ) : null}
            {/* Changes only when the urgency does, so a screen reader hears it once, not every second. */}
            <Text style={styles.hidden} accessibilityLiveRegion="polite">
                {holdAnnouncement(level)}
            </Text>

            {notice ? <Notice tone="warning">{notice}</Notice> : null}
            {slot ? <ActionButton label={button.label} busy={button.busy} disabled={button.disabled} onPress={onLock} /> : null}
            {locked && level === 'normal' ? <Text style={styles.muted}>{HOLD_NOTE}</Text> : null}
            <Text style={styles.muted}>All times are Indian time.</Text>
        </Section>
    );
}

const styles = StyleSheet.create({
    days: { gap: Space[2], paddingVertical: Space[1] },
    day: {
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        backgroundColor: Colors.surface,
    },
    dayText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
    slot: {
        minWidth: 132,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Space[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        backgroundColor: Colors.surface,
    },
    slotText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink, fontVariant: ['tabular-nums'] },
    on: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    onText: { color: Colors.onPrimary },
    dim: { opacity: 0.4 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: Space[3], padding: Space[3], borderRadius: Radius.md },
    normal: { backgroundColor: Colors.infoSoft },
    warning: { backgroundColor: Colors.warningSoft },
    urgent: { backgroundColor: Colors.dangerSoft },
    bannerText: { ...Type.small, flex: 1, color: Colors.ink },
    urgentText: { color: Colors.dangerInk },
    clock: { ...Type.bodyStrong, color: Colors.ink, fontVariant: ['tabular-nums'] },
    hidden: { height: 0, opacity: 0 },
    muted: { ...Type.small, color: Colors.inkMuted },
    retry: { minHeight: 44, justifyContent: 'center' },
    retryText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
});
