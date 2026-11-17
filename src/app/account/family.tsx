import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddPersonSheet } from '@/components/consult/add-person-sheet';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { friendlyError, people, type Person } from '@/lib/consult/api';
import { sortPeople } from '@/lib/consult/people';

const FAMILY_KEY = ['account', 'family'];

export default function FamilyScreen() {
    const queryClient = useQueryClient();
    const [sheet, setSheet] = useState<{ open: boolean; person: Person | null }>({ open: false, person: null });
    const [problem, setProblem] = useState('');

    const list = useQuery({
        queryKey: FAMILY_KEY,
        queryFn: async () => sortPeople(await people.list()),
    });

    const remove = useMutation({
        mutationFn: (id: string) => people.remove(id),
        onSuccess: () => {
            setProblem('');
            void queryClient.invalidateQueries({ queryKey: FAMILY_KEY });
            void queryClient.invalidateQueries({ queryKey: ['checkout', 'people'] });
        },
        // The server refuses while this person has bookings, and says why.
        onError: (error) => setProblem(friendlyError(error, 'Could not remove this person. Please try again.')),
    });

    const confirmRemove = (person: Person) =>
        Alert.alert('Remove this family member?', `${person.name} will no longer appear when you book.`, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(person.id) },
        ]);

    const saved = (list.data ?? []).filter((person) => person.relation?.toLowerCase() !== 'self');
    const self = (list.data ?? []).find((person) => person.relation?.toLowerCase() === 'self');

    if (list.isLoading) return <LoadingBlock label="Loading your family members" />;
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
            <Text style={styles.intro}>
                Anyone you add here can be picked when you book a test or a consultation.
            </Text>

            {problem ? <Notice tone="error">{problem}</Notice> : null}

            {self ? (
                <View style={styles.card}>
                    <Text style={styles.name}>{self.name}</Text>
                    <Text style={styles.detail}>
                        You · {self.gender} · {self.age} years
                    </Text>
                    <Text style={styles.detail}>Your own details live in Edit profile.</Text>
                </View>
            ) : null}

            {saved.length === 0 ? (
                <EmptyState
                    title="No family members yet"
                    body="Add a parent, a child or anyone else you book tests for."
                />
            ) : null}

            {saved.map((person) => (
                <View key={person.id} style={styles.card}>
                    <Text style={styles.name}>{person.name}</Text>
                    <Text style={styles.detail}>
                        {person.relation} · {person.gender} · {person.age} years
                    </Text>
                    <View style={styles.actions}>
                        <Pressable
                            onPress={() => setSheet({ open: true, person })}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${person.name}`}
                            style={styles.action}>
                            <Text style={styles.edit}>Edit</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => confirmRemove(person)}
                            disabled={remove.isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${person.name}`}
                            accessibilityState={{ disabled: remove.isPending }}
                            style={styles.action}>
                            <Text style={styles.remove}>Remove</Text>
                        </Pressable>
                    </View>
                </View>
            ))}

            <ActionButton
                label="Add a family member"
                onPress={() => {
                    setProblem('');
                    setSheet({ open: true, person: null });
                }}
            />

            <AddPersonSheet
                visible={sheet.open}
                person={sheet.person}
                onClose={() => setSheet({ open: false, person: null })}
                onAdded={() => {
                    void queryClient.invalidateQueries({ queryKey: FAMILY_KEY });
                    void queryClient.invalidateQueries({ queryKey: ['checkout', 'people'] });
                }}
            />
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
    name: { ...Type.bodyStrong, color: Colors.ink },
    detail: { ...Type.small, color: Colors.inkMuted },
    actions: { flexDirection: 'row', gap: Space[4], marginTop: Space[1] },
    action: { minHeight: 44, justifyContent: 'center' },
    edit: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    remove: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.dangerInk },
});
