import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CityField, Field, OptionPicker, SubmitButton } from '@/components/info/form-field';
import { Colors, Space, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { infoApi } from '@/lib/info/api';
import { COMPANY_SIZE_OPTIONS, CORPORATE, CORPORATE_FIELD_LABELS, REQUIREMENT_TYPES } from '@/lib/info/corporate';
import { corporateError, EMPTY_CORPORATE, type CorporateForm } from '@/lib/info/forms';

export default function CorporateScreen() {
  const [form, setForm] = useState<CorporateForm>(EMPTY_CORPORATE);
  const [invalid, setInvalid] = useState<string | null>(null);

  const enquiry = useMutation({
    mutationFn: () => infoApi.corporateInquiry(form),
    onSuccess: () => setForm(EMPTY_CORPORATE),
  });

  const set = <K extends keyof CorporateForm>(key: K) => (value: CorporateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setInvalid(null);
  };

  const submit = () => {
    const problem = corporateError(form);
    setInvalid(problem);
    if (!problem) enquiry.mutate();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {CORPORATE.title}
        </Text>
        {CORPORATE.subtitle ? <Text style={styles.body}>{CORPORATE.subtitle}</Text> : null}

        <View style={styles.form}>
          <Field
            label={CORPORATE_FIELD_LABELS.contactName}
            value={form.contactName}
            onChange={set('contactName')}
            autoCapitalize="words"
          />
          <Field
            label={CORPORATE_FIELD_LABELS.workEmail}
            value={form.workEmail}
            onChange={set('workEmail')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={CORPORATE_FIELD_LABELS.mobile}
            value={form.mobile}
            onChange={set('mobile')}
            keyboardType="phone-pad"
            maxLength={10}
            hint="Ten digits, starting with 6 to 9"
          />
          <Field
            label={CORPORATE_FIELD_LABELS.companyName}
            value={form.companyName}
            onChange={set('companyName')}
            autoCapitalize="words"
          />
          <CityField label={CORPORATE_FIELD_LABELS.city} value={form.city} onChange={set('city')} />
          <OptionPicker
            label={CORPORATE_FIELD_LABELS.companySize}
            options={COMPANY_SIZE_OPTIONS}
            value={form.companySize}
            onChange={set('companySize')}
          />
          <OptionPicker
            label={CORPORATE_FIELD_LABELS.requirementType}
            options={REQUIREMENT_TYPES}
            value={form.requirementType}
            onChange={set('requirementType')}
          />
          <Field
            label={`${CORPORATE_FIELD_LABELS.summary} (optional)`}
            value={form.summary}
            onChange={set('summary')}
            multiline
            autoCapitalize="sentences"
          />

          {invalid && (
            <Text style={styles.error} accessibilityRole="alert">
              {invalid}
            </Text>
          )}
          {enquiry.isError && (
            <Text style={styles.error} accessibilityRole="alert">
              {friendlyError(enquiry.error, 'We could not submit your request right now. Please try again shortly.')}
            </Text>
          )}
          {enquiry.isSuccess && (
            <Text style={styles.done} accessibilityLiveRegion="polite">
              Thanks, our corporate partnerships team will reach out shortly.
            </Text>
          )}

          <SubmitButton label="Send enquiry" busy={enquiry.isPending} onPress={submit} />
        </View>

        {CORPORATE.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.title ? (
              <Text style={styles.heading} accessibilityRole="header">
                {section.title}
              </Text>
            ) : null}
            {section.blocks.map((block, j) =>
              block.type === 'list' ? (
                <View key={j} style={styles.list}>
                  {block.items.map((item, k) => (
                    <View key={k} style={styles.item}>
                      <Text style={styles.marker}>•</Text>
                      <Text style={[styles.body, styles.itemText]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text key={j} style={styles.body}>
                  {block.text}
                </Text>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  wrap: { padding: Space[4], gap: Space[3], paddingBottom: Space[12] },
  title: { ...Type.title, color: Colors.ink },
  heading: { ...Type.titleSm, color: Colors.ink, marginTop: Space[2] },
  body: { ...Type.body, color: Colors.inkMuted },
  form: { gap: Space[4], marginTop: Space[2], marginBottom: Space[4] },
  section: { gap: Space[2] },
  list: { gap: Space[1] },
  item: { flexDirection: 'row', gap: Space[2] },
  itemText: { flex: 1 },
  marker: { ...Type.body, color: Colors.primary },
  error: { ...Type.small, color: Colors.dangerInk },
  done: { ...Type.small, color: Colors.successInk },
});
