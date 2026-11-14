import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { addressLabel, type SavedAddress } from '@/lib/checkout';

import { Section } from './section';

interface Props {
    addresses: SavedAddress[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onEdit: (address: SavedAddress) => void;
}

export function AddressSection({ addresses, selectedId, onSelect, onAdd, onEdit }: Props) {
    return (
        <Section step={1} title="Sample collection address">
            {addresses.length === 0 ? (
                <Text style={styles.muted}>You have no saved addresses yet. Add the place the collector should come to.</Text>
            ) : (
                <View style={styles.list} accessibilityRole="radiogroup">
                    {addresses.map((address) => {
                        const checked = address.id === selectedId;
                        return (
                            <View key={address.id} style={[styles.row, checked && styles.rowOn]}>
                                <Pressable
                                    onPress={() => onSelect(address.id)}
                                    accessibilityRole="radio"
                                    accessibilityLabel={addressLabel(address)}
                                    accessibilityState={{ checked }}
                                    style={styles.pick}>
                                    <View style={[styles.dot, checked && styles.dotOn]} />
                                    <Text style={styles.rowText}>{addressLabel(address)}</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onEdit(address)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Edit the address ${addressLabel(address)}`}
                                    style={styles.edit}>
                                    <Text style={styles.editText}>Edit</Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            )}

            <Pressable
                onPress={onAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a new address"
                style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
                <Text style={styles.addText}>Add a new address</Text>
            </Pressable>
        </Section>
    );
}

const styles = StyleSheet.create({
    muted: { ...Type.small, color: Colors.inkMuted },
    list: { gap: Space[2] },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space[2],
        paddingHorizontal: Space[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
    },
    rowOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    pick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 56, paddingVertical: Space[2] },
    dot: { width: 20, height: 20, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.borderStrong },
    dotOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    rowText: { ...Type.small, flex: 1, color: Colors.ink },
    edit: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    editText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    add: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.borderStrong,
    },
    addPressed: { backgroundColor: Colors.surfaceMuted },
    addText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
});
