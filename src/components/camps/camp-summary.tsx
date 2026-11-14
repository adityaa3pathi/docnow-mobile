import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/checkout/section';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { campSummaryLines, type CampTotals } from '@/lib/camps';
import { formatRupees } from '@/lib/consult/format';
import type { Person } from '@/lib/consult/api';

const TONE_INK: Record<string, string> = {
    discount: Colors.successInk,
    wallet: Colors.warningInk,
};

/** The website's Price Summary: who is attending, the rows that apply, then the total. */
export function CampSummary({ totals, person }: { totals: CampTotals; person?: Person | null }) {
    const relation = person?.relation?.toLowerCase() === 'self' ? 'Self' : person?.relation;

    return (
        <Section title="Price Summary">
            {person ? (
                <View style={styles.person}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.muted}>{relation}</Text>
                </View>
            ) : null}
            {campSummaryLines(totals).map((line) => (
                <View key={line.key} style={styles.row}>
                    <Text style={styles.label}>{line.label}</Text>
                    <Text style={[styles.value, TONE_INK[line.tone] ? { color: TONE_INK[line.tone] } : null]}>{line.value}</Text>
                </View>
            ))}
            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatRupees(totals.finalPayable)}</Text>
            </View>
        </Section>
    );
}

const styles = StyleSheet.create({
    person: { gap: 2, padding: Space[3], borderRadius: Radius.md, backgroundColor: Colors.primarySoft },
    personName: { ...Type.bodyStrong, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[4] },
    label: { ...Type.small, color: Colors.inkMuted },
    value: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink, fontVariant: ['tabular-nums'] },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Space[4],
        paddingTop: Space[3],
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    totalLabel: { ...Type.bodyStrong, color: Colors.ink },
    totalValue: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.primary, fontVariant: ['tabular-nums'] },
});
