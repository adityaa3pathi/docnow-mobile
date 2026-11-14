import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ChipGroup, Field, LockedField } from '@/components/account/ui';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Space } from '@/constants/theme';
import { account } from '@/lib/account/api';
import { digitsOnly } from '@/lib/account/auth-forms';
import {
    editProfileBody,
    editProfileForm,
    PROFILE_GENDERS,
    sameProfile,
    validateEditProfile,
    type EditProfileForm,
} from '@/lib/account/profile-forms';
import type { AccountProfile } from '@/lib/account/types';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/consult/api';

const PROFILE_KEY = ['account', 'profile'];

export default function EditProfileScreen() {
    const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: account.profile });

    if (profile.isLoading) return <LoadingBlock label="Loading your profile" />;
    if (profile.error || !profile.data) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(profile.error)} onRetry={() => void profile.refetch()} />
            </View>
        );
    }

    // Keyed on what the server last sent, so a saved change becomes the new starting point.
    return <ProfileForm key={JSON.stringify(editProfileForm(profile.data))} profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: AccountProfile }) {
    const queryClient = useQueryClient();
    const { reloadUser } = useAuth();
    const saved = editProfileForm(profile);
    const [form, setForm] = useState<EditProfileForm>(saved);
    const [problem, setProblem] = useState('');

    const save = useMutation({
        mutationFn: () => account.updateProfile(editProfileBody(form)),
        onSuccess: async () => {
            setProblem('');
            void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
            await reloadUser().catch(() => undefined);
            router.back();
        },
        onError: (error) => setProblem(friendlyError(error, 'Could not save your profile. Please try again.')),
    });

    const submit = () => {
        const found = validateEditProfile(form);
        if (found) {
            setProblem(found);
            return;
        }
        setProblem('');
        save.mutate();
    };

    const field = (key: keyof EditProfileForm) => (value: string) =>
        setForm((current) => ({ ...current, [key]: value }));

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {problem ? <Notice tone="error">{problem}</Notice> : null}

                <Field
                    label="Full name"
                    value={form.name}
                    onChangeText={field('name')}
                    placeholder="Your name as on your records"
                    autoCapitalize="words"
                />
                <Field
                    label="Age"
                    value={form.age}
                    onChangeText={(text) => field('age')(digitsOnly(text, 3))}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="Age in years"
                />
                <ChipGroup label="Gender" options={PROFILE_GENDERS} value={form.gender} onChange={field('gender')} />
                <Field
                    label="Email address"
                    value={form.email}
                    onChangeText={field('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="you@example.com"
                />
                <LockedField
                    label="WhatsApp mobile number"
                    value={profile.mobile}
                    note="This is the number you sign in with. Contact support to change it."
                />

                <ActionButton
                    label="Save changes"
                    busyLabel="Saving..."
                    busy={save.isPending}
                    disabled={sameProfile(form, saved)}
                    onPress={submit}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surface },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[4] },
});
