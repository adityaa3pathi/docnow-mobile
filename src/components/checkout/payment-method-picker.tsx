import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import type { CheckoutPaymentMethod } from '@/lib/checkout';

const OPTIONS: { value: CheckoutPaymentMethod; title: string; body: string }[] = [
    { value: 'ONLINE', title: 'Pay online now', body: 'UPI, cards or net banking' },
    {
        value: 'PAY_ON_COLLECTION',
        title: 'Pay at sample collection',
        body: 'Cash or UPI to the sample collector at your visit',
    },
];

/** Shown only when the server offers pay on collection; otherwise checkout stays online only. */
export function PaymentMethodPicker({
    value,
    onChange,
}: {
    value: CheckoutPaymentMethod;
    onChange: (method: CheckoutPaymentMethod) => void;
}) {
    return (
        <View style={styles.wrap}>
            <Text style={styles.legend} accessibilityRole="header">
                How would you like to pay?
            </Text>
            <View style={styles.list} accessibilityRole="radiogroup">
                {OPTIONS.map((option) => {
                    const checked = option.value === value;
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            accessibilityRole="radio"
                            accessibilityLabel={`${option.title}. ${option.body}`}
                            accessibilityState={{ checked }}
                            style={[styles.row, checked && styles.rowOn]}>
                            <View style={[styles.dot, checked && styles.dotOn]} />
                            <View style={styles.rowText}>
                                <Text style={styles.title}>{option.title}</Text>
                                <Text style={styles.body}>{option.body}</Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: Space[2] },
    legend: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    list: { gap: Space[2] },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space[3],
        minHeight: 56,
        paddingHorizontal: Space[3],
        paddingVertical: Space[2],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
    },
    rowOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    dot: { width: 20, height: 20, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.borderStrong },
    dotOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    rowText: { flex: 1, gap: Space[1] },
    title: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    body: { ...Type.small, color: Colors.inkMuted },
});
