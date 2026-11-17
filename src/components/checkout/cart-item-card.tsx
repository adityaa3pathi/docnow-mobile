import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import type { CartItem } from '@/lib/cart';
import type { Person } from '@/lib/consult/api';
import { formatRupees } from '@/lib/consult/format';

interface Props {
    item: CartItem;
    people: Person[];
    /** The Self person, so a line with nobody chosen still reads as the account holder. */
    selfId: string | null;
    onAssign: (personId: string) => void;
    onAddPerson: () => void;
    onRemove: () => void;
    assigning: boolean;
    removing: boolean;
    /** Set when the lab or the catalog refused this line, so the card says to remove it. */
    unavailableNote?: string | null;
}

/** The person chosen for a line. A null patientId means the account holder on the server. */
export function chosenPersonId(item: CartItem, selfId: string | null): string {
    return item.patientId ?? selfId ?? '';
}

export function CartItemCard({
    item,
    people,
    selfId,
    onAssign,
    onAddPerson,
    onRemove,
    assigning,
    removing,
    unavailableNote,
}: Props) {
    const chosen = chosenPersonId(item, selfId);
    const struck = item.mrp && item.mrp > item.price ? formatRupees(item.mrp) : null;

    return (
        <View style={styles.card}>
            <View style={styles.head}>
                <View style={styles.headText}>
                    <Text style={styles.name}>{item.testName}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatRupees(item.price)}</Text>
                        {struck ? <Text style={styles.mrp}>{struck}</Text> : null}
                    </View>
                </View>
                <Pressable
                    onPress={onRemove}
                    disabled={removing}
                    style={({ pressed }) => [styles.remove, pressed && styles.removePressed, removing && styles.off]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.testName} from the cart`}
                    accessibilityState={{ busy: removing, disabled: removing }}>
                    <Text style={styles.removeText}>{removing ? 'Removing' : 'Remove'}</Text>
                </Pressable>
            </View>

            {unavailableNote ? (
                <Text style={styles.warn} accessibilityRole="alert">
                    {unavailableNote}
                </Text>
            ) : null}

            <Text style={styles.legend} accessibilityRole="header">
                Who is this test for?
            </Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
                {people.map((person) => {
                    const checked = person.id === chosen;
                    const relation = person.relation?.toLowerCase() === 'self' ? 'Me' : person.relation;
                    return (
                        <Pressable
                            key={person.id}
                            onPress={() => onAssign(person.id)}
                            disabled={assigning || checked}
                            accessibilityRole="radio"
                            accessibilityLabel={`${person.name}, ${relation}`}
                            accessibilityState={{ checked, disabled: assigning }}
                            style={[styles.chip, checked && styles.chipOn, assigning && !checked && styles.off]}>
                            <Text style={[styles.chipText, checked && styles.chipTextOn]} numberOfLines={1}>
                                {person.name}
                            </Text>
                            <Text style={[styles.chipRelation, checked && styles.chipTextOn]} numberOfLines={1}>
                                {relation}
                            </Text>
                        </Pressable>
                    );
                })}
                <Pressable
                    onPress={onAddPerson}
                    accessibilityRole="button"
                    accessibilityLabel="Add a family member"
                    style={styles.addChip}>
                    <Text style={styles.addChipText}>Add a family member</Text>
                </Pressable>
            </View>
            {!chosen ? <Text style={styles.muted}>This test is booked in your own name.</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Space[3],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
    headText: { flex: 1, gap: Space[1] },
    name: { ...Type.bodyStrong, color: Colors.ink },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
    price: { ...Type.body, fontFamily: Fonts.semibold, color: Colors.ink, fontVariant: ['tabular-nums'] },
    mrp: { ...Type.small, color: Colors.inkMuted, textDecorationLine: 'line-through' },
    remove: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Space[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    removePressed: { backgroundColor: Colors.surfaceMuted },
    off: { opacity: 0.5 },
    removeText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    warn: { ...Type.small, color: Colors.dangerInk },
    legend: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
    chip: {
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: Space[3],
        paddingVertical: Space[1],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        backgroundColor: Colors.surface,
    },
    chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    chipText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    chipRelation: { ...Type.small, color: Colors.inkMuted },
    chipTextOn: { color: Colors.primary },
    addChip: {
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: Space[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.borderStrong,
    },
    addChipText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    muted: { ...Type.small, color: Colors.inkMuted },
});
