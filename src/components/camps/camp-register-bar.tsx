import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { campPayCta } from '@/lib/camps';
import { formatRupees } from '@/lib/consult/format';

interface Props {
    finalPayable: number;
    hint: string | null;
    ready: boolean;
    busy: boolean;
    onPress: () => void;
}

/** The sticky register bar, the app's version of the website's camp bottom bar. */
export function CampRegisterBar({ finalPayable, hint, ready, busy, onPress }: Props) {
    const insets = useSafeAreaInsets();
    const cta = campPayCta(finalPayable);
    const off = !ready || busy;

    return (
        <View style={[styles.bar, { paddingBottom: Space[3] + insets.bottom }]}>
            {hint ? (
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                    {hint}
                </Text>
            ) : null}
            <View style={styles.row}>
                <View style={styles.amount}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={styles.amountValue}>{formatRupees(finalPayable)}</Text>
                </View>
                <Pressable
                    onPress={onPress}
                    disabled={off}
                    accessibilityRole="button"
                    accessibilityLabel={busy ? 'Registering you for this camp' : cta}
                    accessibilityState={{ disabled: off, busy }}
                    style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, off && styles.off]}>
                    {busy ? <ActivityIndicator color={Colors.onPrimary} /> : null}
                    <Text style={styles.ctaText} numberOfLines={1}>
                        {busy ? 'Processing...' : cta}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        gap: Space[1],
        paddingHorizontal: Space[4],
        paddingTop: Space[3],
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    hint: { ...Type.small, color: Colors.warningInk },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3] },
    amount: { gap: Space[1] },
    amountLabel: { ...Type.small, color: Colors.inkMuted },
    amountValue: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
    cta: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Space[2],
        minHeight: 48,
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
    },
    ctaPressed: { backgroundColor: Colors.primaryHover },
    off: { opacity: 0.5 },
    ctaText: { ...Type.bodyStrong, color: Colors.onPrimary },
});
