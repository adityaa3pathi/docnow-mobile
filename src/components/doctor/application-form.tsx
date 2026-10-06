import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { RejectedNotice } from '@/components/doctor/status-screens';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { DOCTOR_ME_KEY } from '@/hooks/use-doctor-me';
import { consult, doctor as doctorApi, errorStatus, friendlyError } from '@/lib/consult/api';
import { validateDoctorForm, type DoctorFormErrors, type DoctorFormValues } from '@/lib/consult/doctorForm';
import type { DoctorMe } from '@/lib/consult/types';

function fromExisting(d?: DoctorMe): DoctorFormValues {
  return {
    displayName: d?.displayName ?? '',
    specialtyId: d?.specialtyId ?? '',
    qualification: d?.qualification ?? '',
    registrationNumber: d?.registrationNumber ?? '',
    registrationCouncil: d?.registrationCouncil ?? '',
    experienceYears: String(d?.experienceYears ?? 0),
    languages: d?.languages.join(', ') ?? '',
    bio: d?.bio ?? '',
    photoUrl: d?.photoUrl ?? '',
  };
}

function Field({ label, hint, error, ...input }: { label: string; hint?: string; error?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, input.multiline && styles.multiline, !!error && styles.inputError]}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={Colors.mutedForeground}
        {...input}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

export function ApplicationForm({ existing }: { existing?: DoctorMe }) {
  const queryClient = useQueryClient();
  const specialties = useQuery({ queryKey: ['consult', 'specialties'], queryFn: consult.specialties });
  const [values, setValues] = useState<DoctorFormValues>(() => fromExisting(existing));
  const [errors, setErrors] = useState<DoctorFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: (input: Parameters<typeof doctorApi.register>[0]) => (existing ? doctorApi.resubmit(input) : doctorApi.register(input)),
    onSuccess: (me) => queryClient.setQueryData(DOCTOR_ME_KEY, me),
    onError: (e) => {
      setFormError(
        errorStatus(e) === 429 ? 'You have tried too many times. Please wait a while and try again.' : friendlyError(e),
      );
    },
  });

  const set = (key: keyof DoctorFormValues) => (text: string) => setValues((v) => ({ ...v, [key]: text }));

  const submit = () => {
    setFormError(null);
    const result = validateDoctorForm(values);
    if ('errors' in result) {
      setErrors(result.errors);
      setFormError('Please fix the details marked below.');
      return;
    }
    setErrors({});
    send.mutate(result.input);
  };

  if (specialties.isLoading) return <LoadingBlock label="Loading the form" />;
  if (specialties.error) return <View style={styles.pad}><ErrorState message={friendlyError(specialties.error)} onRetry={() => void specialties.refetch()} /></View>;
  const list = (specialties.data ?? []).filter((s) => s.isActive);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {existing ? (
          <RejectedNotice doctor={existing} />
        ) : (
          <View style={styles.intro}>
            <Text style={styles.title} accessibilityRole="header">Join as a doctor</Text>
            <Text style={styles.hint}>Tell us about yourself. We will check your details before patients can book you.</Text>
          </View>
        )}
        <Card>
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <Field label="Your name" value={values.displayName} onChangeText={set('displayName')} error={errors.displayName} autoComplete="name" />
          <View style={styles.field}>
            <Text style={styles.label}>Specialty</Text>
            {list.length === 0 ? (
              <EmptyState title="No specialties yet" body="Please try again later." />
            ) : (
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Specialty">
                {list.map((s) => {
                  const active = values.specialtyId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => set('specialtyId')(s.id)}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="radio"
                      accessibilityLabel={s.name}
                      accessibilityState={{ selected: active }}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {errors.specialtyId ? <Text style={styles.error} accessibilityRole="alert">{errors.specialtyId}</Text> : null}
          </View>
          <Field label="Qualification" hint="For example MBBS, MD (Medicine)." value={values.qualification} onChangeText={set('qualification')} error={errors.qualification} />
          <Field label="Registration number" value={values.registrationNumber} onChangeText={set('registrationNumber')} error={errors.registrationNumber} autoCapitalize="characters" />
          <Field label="Registration council" hint="For example Delhi Medical Council." value={values.registrationCouncil} onChangeText={set('registrationCouncil')} error={errors.registrationCouncil} />
          <Field label="Years of experience" value={values.experienceYears} onChangeText={set('experienceYears')} error={errors.experienceYears} keyboardType="number-pad" maxLength={2} />
          <Field label="Languages you speak" hint="Separate with commas, for example English, Hindi." value={values.languages} onChangeText={set('languages')} error={errors.languages} />
          <Field label="About you (optional)" hint="Up to 1000 characters." value={values.bio} onChangeText={set('bio')} error={errors.bio} multiline numberOfLines={4} textAlignVertical="top" />
          <Field label="Photo web address (optional)" value={values.photoUrl} onChangeText={set('photoUrl')} error={errors.photoUrl} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false} />
          <ActionButton
            label={existing ? 'Send again for review' : 'Send application'}
            busyLabel="Sending..."
            busy={send.isPending}
            onPress={submit}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16 },
  content: { padding: 16, gap: 12 },
  intro: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  field: { gap: 4 },
  label: { fontWeight: '600', color: Colors.foreground },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: Colors.foreground },
  multiline: { minHeight: 96 },
  inputError: { borderWidth: 1, borderColor: Colors.destructive },
  hint: { fontSize: 12, color: Colors.mutedForeground },
  error: { fontSize: 12, fontWeight: '600', color: Colors.destructive },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontWeight: '600', color: Colors.foreground },
  chipTextActive: { color: Colors.primaryForeground },
});
