import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { CAMP_NO_CANCEL_NOTE, campResultView } from '@/lib/camps';
import { keepPolling, POLL_EVERY_MS, POLL_FOR_MS, SLOW_NOTE, viewFor, type ResultTone } from '@/lib/checkout';
import { lab } from '@/lib/lab/api';
import { formatSlotDate } from '@/lib/lab/bookings';

const TONE_BG: Record<ResultTone, string> = {
    success: Colors.successSoft,
    warning: Colors.warningSoft,
    danger: Colors.dangerSoft,
    muted: Colors.surfaceMuted,
};

const TONE_INK: Record<ResultTone, string> = {
    success: Colors.successInk,
    warning: Colors.warningInk,
    danger: Colors.dangerInk,
    muted: Colors.ink,
};

/** What happened to the registration just placed. The server's outcome decides every word on it. */
export default function CampResultScreen() {
    const { bookingId, verified } = useLocalSearchParams<{ bookingId?: string; verified?: string }>();
    const [slow, setSlow] = useState(false);
    // The verify reply already settled some registrations, so the first frame need not say "confirming".
    const early = verified === 'confirmed' || verified === 'refunded' ? verified : null;

    const status = useQuery({
        queryKey: ['lab', 'payment-status', bookingId],
        enabled: Boolean(bookingId),
        queryFn: () => lab.paymentStatus(bookingId!),
        refetchInterval: (query) => (keepPolling(query.state.data?.outcome ?? null, slow) ? POLL_EVERY_MS : false),
    });

    // One timer, so the note appears, and polling stops, even if every poll in between failed.
    useEffect(() => {
        const timer = setTimeout(() => setSlow(true), POLL_FOR_MS);
        return () => clearTimeout(timer);
    }, []);

    const data = status.data ?? null;
    const outcome = viewFor(data?.outcome ?? early, Boolean(bookingId));
    const view = campResultView(outcome);
    const registered = outcome === 'confirmed' || outcome === 'pending';

    if (!bookingId) {
        return (
            <View style={styles.pad}>
                <Text style={styles.title}>We could not find that registration</Text>
                <Text style={styles.body}>Open your lab bookings to see the latest one.</Text>
                <Pressable
                    onPress={() => router.replace('/lab/bookings')}
                    accessibilityRole="button"
                    accessibilityLabel="Go to my lab bookings"
                    style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                    <Text style={styles.ctaText}>Go to my lab bookings</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
            <View style={[styles.hero, { backgroundColor: TONE_BG[view.tone] }]} accessibilityLiveRegion="polite">
                <Text style={[styles.title, { color: TONE_INK[view.tone] }]} accessibilityRole="header">
                    {view.title}
                </Text>
                <Text style={styles.body}>{view.body}</Text>
                {outcome === 'pending' && slow ? <Text style={styles.slow}>{SLOW_NOTE}</Text> : null}
            </View>

            {status.isLoading ? <LoadingBlock label="Checking your registration" /> : null}

            {registered && (data?.slotDate || data?.address) ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle} accessibilityRole="header">
                        Your camp
                    </Text>
                    {data?.address ? (
                        <Text style={styles.row}>
                            {[data.address.line1, data.address.city, data.address.pincode].filter(Boolean).join(', ')}
                        </Text>
                    ) : null}
                    {/* slotTime is the word "Camp" on a camp booking, so only the date is shown. */}
                    {data?.slotDate ? <Text style={styles.row}>From {formatSlotDate(data.slotDate)}</Text> : null}
                    <Text style={styles.body}>{CAMP_NO_CANCEL_NOTE}</Text>
                </View>
            ) : null}

            <Pressable
                onPress={() => router.replace({ pathname: '/lab/booking/[id]', params: { id: bookingId } })}
                accessibilityRole="button"
                accessibilityLabel="View this booking"
                style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <Text style={styles.ctaText}>View this booking</Text>
            </Pressable>

            <Pressable
                onPress={() => router.replace('/camps')}
                accessibilityRole="button"
                accessibilityLabel="Browse health camps"
                style={styles.secondary}>
                <Text style={styles.secondaryText}>Browse health camps</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    content: { padding: Space[4], gap: Space[3] },
    pad: { padding: Space[4], gap: Space[3] },
    hero: { gap: Space[2], padding: Space[4], borderRadius: Radius.lg },
    title: { ...Type.title, color: Colors.ink },
    body: { ...Type.small, color: Colors.inkMuted },
    slow: { ...Type.small, fontFamily: Fonts.medium, color: Colors.warningInk },
    card: {
        gap: Space[2],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    cardTitle: { ...Type.bodyStrong, color: Colors.ink },
    row: { ...Type.small, color: Colors.ink },
    cta: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary },
    ctaPressed: { backgroundColor: Colors.primaryHover },
    ctaText: { ...Type.bodyStrong, color: Colors.onPrimary },
    secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
