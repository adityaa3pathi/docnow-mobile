import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import {
    addressLabel,
    collectionFeeNote,
    payableView,
    summaryLines,
    type CheckoutPaymentMethod,
    type SavedAddress,
    type Totals,
} from '@/lib/checkout';
import type { Person } from '@/lib/consult/api';
import { formatSlotDate } from '@/lib/lab/bookings';

import { PaymentMethodPicker } from './payment-method-picker';
import { Section } from './section';

interface Props {
    totals: Totals;
    address: SavedAddress | null;
    date: string;
    slotLabel: string | null;
    people: Person[];
    billingPatientId: string;
    onBillingPatient: (id: string) => void;
    payOnCollectionOffered: boolean;
    paymentMethod: CheckoutPaymentMethod;
    onPaymentMethod: (method: CheckoutPaymentMethod) => void;
    payAtCollection: boolean;
}

export function OrderSummary({
    totals,
    address,
    date,
    slotLabel,
    people,
    billingPatientId,
    onBillingPatient,
    payOnCollectionOffered,
    paymentMethod,
    onPaymentMethod,
    payAtCollection,
}: Props) {
    const lines = summaryLines(totals);
    const note = collectionFeeNote(totals);
    const payable = payableView(totals.finalPayable, payAtCollection);
    const invoiceOptions = [{ id: 'self', name: 'Me', relation: '' }, ...people.filter((p) => p.relation?.toLowerCase() !== 'self')];

    return (
        <Section step={4} title="Order summary">
            <View style={styles.lines}>
                {lines.map((line) => (
                    <View key={line.key} style={styles.line}>
                        <Text style={styles.label}>{line.label}</Text>
                        <Text
                            style={[
                                styles.value,
                                line.tone === 'free' && styles.free,
                                line.tone === 'discount' && styles.free,
                                line.tone === 'wallet' && styles.wallet,
                            ]}>
                            {line.value}
                        </Text>
                    </View>
                ))}
            </View>
            {note ? <Text style={styles.muted}>{note}</Text> : null}

            {address ? (
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Collection at</Text>
                    <Text style={styles.muted}>{addressLabel(address)}</Text>
                    {slotLabel ? (
                        <Text style={styles.muted}>
                            {formatSlotDate(date)}, {slotLabel}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            <Text style={styles.legend} accessibilityRole="header">
                Whose name goes on the invoice?
            </Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
                {invoiceOptions.map((option) => {
                    const checked = option.id === billingPatientId;
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => onBillingPatient(option.id)}
                            accessibilityRole="radio"
                            accessibilityLabel={option.relation ? `${option.name}, ${option.relation}` : option.name}
                            accessibilityState={{ checked }}
                            style={[styles.chip, checked && styles.chipOn]}>
                            <Text style={[styles.chipText, checked && styles.chipTextOn]}>{option.name}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {payOnCollectionOffered && totals.finalPayable > 0 ? (
                <PaymentMethodPicker value={paymentMethod} onChange={onPaymentMethod} />
            ) : null}

            <View style={styles.total}>
                <Text style={styles.totalLabel}>{payable.label}</Text>
                <Text style={styles.totalValue}>{payable.amount}</Text>
            </View>
        </Section>
    );
}

const styles = StyleSheet.create({
    lines: { gap: Space[2] },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: Space[3] },
    label: { ...Type.small, color: Colors.inkMuted },
    value: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink, fontVariant: ['tabular-nums'] },
    free: { color: Colors.successInk },
    wallet: { color: Colors.primary },
    muted: { ...Type.small, color: Colors.inkMuted },
    block: { gap: Space[1], padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.surfaceSubtle },
    blockTitle: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    legend: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
    chip: {
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
    },
    chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    chipText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    chipTextOn: { color: Colors.primary },
    total: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Space[3],
        paddingTop: Space[3],
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    totalLabel: { ...Type.bodyStrong, color: Colors.ink },
    totalValue: { ...Type.bodyLg, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
});
