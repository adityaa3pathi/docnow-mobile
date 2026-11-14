import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Shadow, Space, Type } from '@/constants/theme';
import { profile, type MissingProfileFields } from '@/lib/checkout';
import { friendlyError } from '@/lib/consult/api';

interface Props {
    visible: boolean;
    missing: MissingProfileFields;
    onClose: () => void;
    onSaved: () => void;
}

const SEXES = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
];

/** The lab needs a name, sex and age on every booking, so checkout asks for what is missing. */
export function ProfileSheet({ visible, missing, onClose, onSaved }: Props) {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save() {
        if (missing.name && !name.trim()) {
            setError('Please enter your full name');
            return;
        }
        const years = parseInt(age, 10);
        if (missing.age && !(years > 0)) {
            setError('Please enter your age in years');
            return;
        }
        if (missing.gender && !gender) {
            setError('Please choose your sex');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await profile.update({
                ...(missing.name ? { name: name.trim() } : {}),
                ...(missing.age ? { age: years } : {}),
                ...(missing.gender ? { gender } : {}),
            });
            onSaved();
        } catch (e) {
            setError(friendlyError(e, 'We could not save your details. Please try again.'));
        } finally {
            setSaving(false);
        }
    }

    const close = () => {
        if (saving) return;
        setError('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.sheet}>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                        <Text style={styles.title} accessibilityRole="header">
                            A few details first
                        </Text>
                        <Text style={styles.body}>The lab needs these for your booking and your report.</Text>

                        {missing.name ? (
                            <>
                                <Text style={styles.label}>Full name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Your full name"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="Full name"
                                />
                            </>
                        ) : null}

                        {missing.age ? (
                            <>
                                <Text style={styles.label}>Age</Text>
                                <TextInput
                                    style={styles.input}
                                    value={age}
                                    onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                    placeholder="Age in years"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="Age in years"
                                />
                            </>
                        ) : null}

                        {missing.gender ? (
                            <>
                                <Text style={styles.label}>Sex</Text>
                                <View style={styles.chips} accessibilityRole="radiogroup">
                                    {SEXES.map((option) => {
                                        const checked = option.value === gender;
                                        return (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => setGender(option.value)}
                                                accessibilityRole="radio"
                                                accessibilityLabel={option.label}
                                                accessibilityState={{ checked }}
                                                style={[styles.chip, checked && styles.chipOn]}>
                                                <Text style={[styles.chipText, checked && styles.chipTextOn]}>{option.label}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        ) : null}

                        {error ? <Notice tone="error">{error}</Notice> : null}
                        <ActionButton label="Save and continue" busyLabel="Saving" busy={saving} onPress={save} />
                        <Pressable
                            style={styles.secondary}
                            onPress={close}
                            disabled={saving}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel">
                            <Text style={styles.secondaryText}>Cancel</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
    sheet: {
        maxHeight: '90%',
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        backgroundColor: Colors.surface,
        ...Shadow.raised,
    },
    content: { padding: Space[6], gap: Space[2] },
    title: { ...Type.titleSm, color: Colors.ink },
    body: { ...Type.small, color: Colors.inkMuted },
    label: { ...Type.bodyStrong, marginTop: Space[2], color: Colors.ink },
    input: {
        ...Type.body,
        minHeight: 44,
        paddingHorizontal: Space[3],
        paddingVertical: Space[2],
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.md,
        color: Colors.ink,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
    chip: {
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
    },
    chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    chipText: { ...Type.bodyStrong, color: Colors.ink },
    chipTextOn: { color: Colors.onPrimary },
    secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
