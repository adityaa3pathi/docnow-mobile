import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ContactRow } from '@/components/info/info-blocks';
import { CityField, Field, SubmitButton } from '@/components/info/form-field';
import { Colors, Space, Type } from '@/constants/theme';
import { infoApi } from '@/lib/info/api';
import { callbackError, EMPTY_CALLBACK, type CallbackForm } from '@/lib/info/forms';
import {
  CONTACT_TITLE,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_LINK,
} from '@/lib/info/support-config';
import { friendlyError } from '@/lib/consult/api';

export default function ContactScreen() {
  const [form, setForm] = useState<CallbackForm>(EMPTY_CALLBACK);
  const [invalid, setInvalid] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () => infoApi.requestCallback(form),
    onSuccess: () => setForm(EMPTY_CALLBACK),
  });

  const set = <K extends keyof CallbackForm>(key: K) => (value: CallbackForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setInvalid(null);
  };

  const submit = () => {
    const problem = callbackError(form);
    setInvalid(problem);
    if (!problem) request.mutate();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {CONTACT_TITLE}
        </Text>

        <ContactRow label="Call or WhatsApp" value={SUPPORT_PHONE_DISPLAY} href={`tel:${SUPPORT_PHONE_LINK}`} />
        <ContactRow label="Email support" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
        <ContactRow label="Support hours" value={SUPPORT_HOURS} />
        <ContactRow label="Address" value={SUPPORT_ADDRESS} />

        <Text style={styles.heading} accessibilityRole="header">
          Get a callback
        </Text>
        <Text style={styles.body}>Leave your number and a health expert will call you back.</Text>

        <View style={styles.form}>
          <Field label="Your name" value={form.name} onChange={set('name')} autoCapitalize="words" />
          <Field
            label="Mobile number"
            value={form.mobile}
            onChange={set('mobile')}
            keyboardType="phone-pad"
            maxLength={10}
            hint="Ten digits, starting with 6 to 9"
          />
          <CityField label="City" value={form.city} onChange={set('city')} />

          {invalid && (
            <Text style={styles.error} accessibilityRole="alert">
              {invalid}
            </Text>
          )}
          {request.isError && (
            <Text style={styles.error} accessibilityRole="alert">
              {friendlyError(request.error, 'Could not send your request. Please try again.')}
            </Text>
          )}
          {request.isSuccess && (
            <Text style={styles.done} accessibilityLiveRegion="polite">
              Request received. Our health expert will call you shortly.
            </Text>
          )}

          <SubmitButton label="Request a callback" busy={request.isPending} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  wrap: { padding: Space[4], gap: Space[3], paddingBottom: Space[12] },
  title: { ...Type.title, color: Colors.ink },
  heading: { ...Type.titleSm, color: Colors.ink, marginTop: Space[4] },
  body: { ...Type.body, color: Colors.inkMuted },
  form: { gap: Space[4], marginTop: Space[2] },
  error: { ...Type.small, color: Colors.dangerInk },
  done: { ...Type.small, color: Colors.successInk },
});
