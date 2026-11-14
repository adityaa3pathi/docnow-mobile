import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { PasswordField } from '@/components/account/ui';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Space, Type } from '@/constants/theme';
import { account } from '@/lib/account/api';
import { PASSWORD_HINT } from '@/lib/account/auth-forms';
import { validatePasswordChange, type PasswordForm } from '@/lib/account/profile-forms';
import { friendlyError } from '@/lib/consult/api';

const empty: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordScreen() {
    const [form, setForm] = useState<PasswordForm>(empty);
    const [problem, setProblem] = useState('');
    const [done, setDone] = useState(false);

    const change = useMutation({
        mutationFn: () => account.changePassword(form.currentPassword, form.newPassword),
        onSuccess: () => {
            setProblem('');
            setForm(empty);
            setDone(true);
        },
        onError: (error) => setProblem(friendlyError(error, 'Could not change your password. Please try again.')),
    });

    const submit = () => {
        const found = validatePasswordChange(form);
        if (found) {
            setProblem(found);
            return;
        }
        setProblem('');
        setDone(false);
        change.mutate();
    };

    const field = (key: keyof PasswordForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.intro}>
                    Your other devices stay signed in. Use log out of all devices if you want them signed out.
                </Text>

                {problem ? <Notice tone="error">{problem}</Notice> : null}
                {done ? <Notice tone="success">Your password has been changed.</Notice> : null}

                <PasswordField
                    label="Current password"
                    value={form.currentPassword}
                    onChangeText={field('currentPassword')}
                    placeholder="Your current password"
                    textContentType="password"
                />
                <PasswordField
                    label="New password"
                    value={form.newPassword}
                    onChangeText={field('newPassword')}
                    placeholder="New password"
                    hint={PASSWORD_HINT}
                    textContentType="newPassword"
                />
                <PasswordField
                    label="Confirm new password"
                    value={form.confirmPassword}
                    onChangeText={field('confirmPassword')}
                    placeholder="Type the new password again"
                    textContentType="newPassword"
                />

                <ActionButton
                    label="Update password"
                    busyLabel="Saving..."
                    busy={change.isPending}
                    onPress={submit}
                />
                {done ? <ActionButton label="Done" variant="soft" onPress={() => router.back()} /> : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surface },
    content: { padding: Space[4], gap: Space[4] },
    intro: { ...Type.small, color: Colors.inkMuted },
});
