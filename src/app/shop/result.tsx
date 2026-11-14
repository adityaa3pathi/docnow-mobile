import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import {
    dueLine,
    keepPolling,
    NEXT_STEPS,
    POLL_EVERY_MS,
    POLL_FOR_MS,
    resultView,
    SLOW_NOTE,
    viewFor,
    type ResultTone,
} from '@/lib/checkout';
import { PAY_ON_COLLECTION } from '@/lib/lab/money';
import { lab } from '@/lib/lab/api';
import { formatSlotDate, isReadableSlotTime } from '@/lib/lab/bookings';

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

/** What happened to the order just placed. The server's outcome decides every word on it. */
export default function ResultScreen() {
    const { bookingId, verified, collection } = useLocalSearchParams<{
        bookingId?: string;
        verified?: string;
        collection?: string;
    }>();
    const [slow, setSlow] = useState(false);
    // The verify reply already settled some orders, so the first frame need not say "confirming".
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
    // Until the first reply lands, the cart's own hint keeps a pay-at-collection order honest.
    const payAtCollection = data ? data.paymentMethod === PAY_ON_COLLECTION : collection === '1';
    const view = resultView(outcome, payAtCollection);
    const due = dueLine(payAtCollection, outcome, data?.amountDue ?? 0);

    if (!bookingId) {
        return (
            <View style={styles.pad}>
                <Text style={styles.title}>We could not find that order</Text>
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
                {due ? <Text style={styles.due}>{due}</Text> : null}
                {outcome === 'pending' && slow ? <Text style={styles.slow}>{SLOW_NOTE}</Text> : null}
            </View>

            {status.isLoading ? <LoadingBlock label="Checking your booking" /> : null}

            {data?.slotDate || data?.address ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle} accessibilityRole="header">
                        Your appointment
                    </Text>
                    {data?.slotDate ? (
                        <Text style={styles.row}>
                            {formatSlotDate(data.slotDate)}
                            {isReadableSlotTime(data.slotTime) ? `, ${data.slotTime}` : ''}
                        </Text>
                    ) : null}
                    {data?.address ? (
                        <Text style={styles.row}>
                            {[data.address.line1, data.address.city, data.address.pincode].filter(Boolean).join(', ')}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {view.showNextSteps ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle} accessibilityRole="header">
                        What happens next
                    </Text>
                    {NEXT_STEPS.map((step, index) => (
                        <View key={step.title} style={styles.step}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                            <View style={styles.stepText}>
                                <Text style={styles.stepTitle}>{step.title}</Text>
                                <Text style={styles.body}>{step.body}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : null}

            <Pressable
                onPress={() => router.replace({ pathname: '/lab/booking/[id]', params: { id: bookingId } })}
                accessibilityRole="button"
                accessibilityLabel="View this booking"
                style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <Text style={styles.ctaText}>View this booking</Text>
            </Pressable>

            {view.showBackToCart ? (
                <Pressable
                    onPress={() => router.replace('/shop/cart')}
                    accessibilityRole="button"
                    accessibilityLabel="Back to the cart"
                    style={styles.secondary}>
                    <Text style={styles.secondaryText}>Back to the cart</Text>
                </Pressable>
            ) : (
                <Pressable
                    onPress={() => router.replace('/tests')}
                    accessibilityRole="button"
                    accessibilityLabel="Book more tests"
                    style={styles.secondary}>
                    <Text style={styles.secondaryText}>Book more tests</Text>
                </Pressable>
            )}
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
    due: { ...Type.bodyStrong, color: Colors.ink },
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
    step: { flexDirection: 'row', gap: Space[3] },
    stepNumber: {
        ...Type.small,
        fontFamily: Fonts.bold,
        width: 24,
        height: 24,
        borderRadius: Radius.full,
        textAlign: 'center',
        lineHeight: 24,
        color: Colors.onPrimary,
        backgroundColor: Colors.primary,
    },
    stepText: { flex: 1, gap: Space[1] },
    stepTitle: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    cta: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary },
    ctaPressed: { backgroundColor: Colors.primaryHover },
    ctaText: { ...Type.bodyStrong, color: Colors.onPrimary },
    secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
