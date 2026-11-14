import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddressSheet } from '@/components/checkout/address-sheet';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { DEFAULT_BADGE, DEFAULT_NOTE, resolveDefaultId, sortByDefault } from '@/lib/account/addresses';
import { readDefaultAddressId, saveDefaultAddressId } from '@/lib/account/store';
import { addresses as addressApi, addressLabel, type SavedAddress } from '@/lib/checkout';
import { friendlyError } from '@/lib/consult/api';

const ADDRESS_KEY = ['checkout', 'addresses'];
const DEFAULT_KEY = ['account', 'default-address'];

export default function AddressesScreen() {
    const queryClient = useQueryClient();
    const [sheet, setSheet] = useState<{ open: boolean; address: SavedAddress | null }>({ open: false, address: null });
    const [problem, setProblem] = useState('');

    const list = useQuery({ queryKey: ADDRESS_KEY, queryFn: addressApi.list });
    const stored = useQuery({ queryKey: DEFAULT_KEY, queryFn: readDefaultAddressId });

    const refreshAll = () => {
        void queryClient.invalidateQueries({ queryKey: ADDRESS_KEY });
        void queryClient.invalidateQueries({ queryKey: DEFAULT_KEY });
    };

    const remove = useMutation({
        mutationFn: (id: string) => addressApi.remove(id),
        onSuccess: () => {
            setProblem('');
            refreshAll();
        },
        // The server refuses to delete the only saved address, and says so.
        onError: (error) => setProblem(friendlyError(error, 'Could not remove this address. Please try again.')),
    });

    const makeDefault = useMutation({
        mutationFn: (id: string) => saveDefaultAddressId(id),
        onSuccess: refreshAll,
    });

    const saved = list.data ?? [];
    const defaultId = resolveDefaultId(saved, stored.data);
    const ordered = sortByDefault(saved, stored.data);

    const confirmRemove = (address: SavedAddress) =>
        Alert.alert('Remove this address?', addressLabel(address), [
            { text: 'Keep', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(address.id) },
        ]);

    if (list.isLoading) return <LoadingBlock label="Loading your addresses" />;
    if (list.error) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(list.error)} onRetry={() => void list.refetch()} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={list.isRefetching}
                    onRefresh={() => void list.refetch()}
                    tintColor={Colors.primary}
                />
            }>
            <Text style={styles.intro}>{DEFAULT_NOTE}</Text>

            {problem ? <Notice tone="error">{problem}</Notice> : null}

            {ordered.length === 0 ? (
                <EmptyState
                    title="No saved addresses yet"
                    body="Add the place the sample collector should come to."
                />
            ) : null}

            {ordered.map((address) => {
                const isDefault = address.id === defaultId;
                return (
                    <View key={address.id} style={[styles.card, isDefault && styles.cardOn]}>
                        <View style={styles.head}>
                            <Text style={styles.city}>{address.city}</Text>
                            {isDefault ? (
                                <Text style={styles.badge} accessibilityLabel="This is your default address">
                                    {DEFAULT_BADGE}
                                </Text>
                            ) : null}
                        </View>
                        <Text style={styles.detail}>{addressLabel(address)}</Text>
                        <View style={styles.actions}>
                            <Pressable
                                onPress={() => setSheet({ open: true, address })}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit the address ${addressLabel(address)}`}
                                style={styles.action}>
                                <Text style={styles.edit}>Edit</Text>
                            </Pressable>
                            {isDefault ? null : (
                                <Pressable
                                    onPress={() => makeDefault.mutate(address.id)}
                                    disabled={makeDefault.isPending}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Make ${addressLabel(address)} the default address`}
                                    accessibilityState={{ disabled: makeDefault.isPending }}
                                    style={styles.action}>
                                    <Text style={styles.edit}>Make default</Text>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={() => confirmRemove(address)}
                                disabled={remove.isPending}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove the address ${addressLabel(address)}`}
                                accessibilityState={{ disabled: remove.isPending }}
                                style={styles.action}>
                                <Text style={styles.remove}>Remove</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            })}

            <ActionButton
                label="Add a new address"
                onPress={() => {
                    setProblem('');
                    setSheet({ open: true, address: null });
                }}
            />

            {sheet.open ? (
                <AddressSheet
                    address={sheet.address}
                    onClose={() => setSheet({ open: false, address: null })}
                    onSaved={(address) => {
                        // Editing replaces the row, so the default has to follow the new id.
                        if (sheet.address && sheet.address.id === defaultId) makeDefault.mutate(address.id);
                        refreshAll();
                    }}
                />
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3] },
    intro: { ...Type.small, color: Colors.inkMuted },
    card: {
        gap: Space[1],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    cardOn: { borderColor: Colors.primary },
    head: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
    city: { ...Type.bodyStrong, color: Colors.ink },
    badge: {
        ...Type.small,
        fontFamily: Fonts.semibold,
        color: Colors.primary,
        paddingHorizontal: Space[2],
        paddingVertical: 2,
        borderRadius: Radius.full,
        backgroundColor: Colors.primarySoft,
        overflow: 'hidden',
    },
    detail: { ...Type.small, color: Colors.inkMuted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[4], marginTop: Space[1] },
    action: { minHeight: 44, justifyContent: 'center' },
    edit: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    remove: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.dangerInk },
});
