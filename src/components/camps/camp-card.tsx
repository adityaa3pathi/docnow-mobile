import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { campDateRange, campPlace, campStatus, testCount, testCountLabel, type ActiveCamp } from '@/lib/camps';
import { formatRupees } from '@/lib/consult/format';
import { toneColors } from '@/lib/consult/status';

/** One camp in the list, with the website's status pill, dates, place and starting price. */
export function CampCard({ camp }: { camp: ActiveCamp }) {
    const status = campStatus(camp.startDate, camp.endDate);
    const pill = toneColors[status.tone];
    const count = testCount(camp);
    const dates = campDateRange(camp.startDate, camp.endDate);
    const place = campPlace(camp);

    return (
        <Pressable
            onPress={() => router.push({ pathname: '/camps/[id]', params: { id: camp.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${camp.name}. ${status.label}. ${place}. ${dates}. Starting at ${formatRupees(camp.price)}`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.pillText, { color: pill.fg }]}>{status.label}</Text>
            </View>

            <Text style={styles.name}>{camp.name}</Text>
            <Text style={styles.place}>{place}</Text>
            {camp.description ? (
                <Text style={styles.body} numberOfLines={2}>
                    {camp.description}
                </Text>
            ) : null}

            <Text style={styles.meta}>{dates}</Text>
            {count > 0 ? <Text style={styles.meta}>{testCountLabel(count)}</Text> : null}

            <View style={styles.foot}>
                <View>
                    <Text style={styles.priceLabel}>Starting at</Text>
                    <Text style={styles.price}>{formatRupees(camp.price)}</Text>
                </View>
                <View style={styles.cta}>
                    <Text style={styles.ctaText}>Register</Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Space[2],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    pressed: { backgroundColor: Colors.surfaceMuted },
    pill: { alignSelf: 'flex-start', paddingHorizontal: Space[3], paddingVertical: Space[1], borderRadius: Radius.full },
    pillText: { ...Type.small, fontFamily: Fonts.semibold },
    name: { ...Type.bodyLg, fontFamily: Fonts.semibold, color: Colors.ink },
    place: { ...Type.small, color: Colors.ink },
    body: { ...Type.small, color: Colors.inkMuted },
    meta: { ...Type.small, color: Colors.inkMuted },
    foot: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Space[4],
        marginTop: Space[2],
        paddingTop: Space[3],
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    priceLabel: { ...Type.small, color: Colors.inkMuted },
    price: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
    cta: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
    ctaText: { ...Type.bodyStrong, color: Colors.onPrimary },
});
