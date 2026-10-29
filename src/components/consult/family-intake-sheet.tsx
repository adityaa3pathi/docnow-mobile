import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Person } from '@/lib/consult/api';
import {
  ALLERGY_PRESETS,
  CONDITION_PRESETS,
  formatMobile,
  MAX_REPORTS,
  MEDICINE_SUGGESTIONS,
  NONE,
  toggleChip,
  type IntakeDraft,
} from '@/lib/consult/family';
import { formatIstDay } from '@/lib/consult/time';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';
import { bookingsApi } from '@/lib/tests/api';

interface Props {
  person: Person;
  value: IntakeDraft;
  onChange: (next: IntakeDraft) => void;
}

function Chip({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        hapticImpact(ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="checkbox"
      aria-checked={on}
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Recent DocNow lab reports the booker can share with the doctor. */
function ReportPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const bookings = useQuery({ queryKey: ['tests', 'bookings', 'for-intake'], queryFn: bookingsApi.list, staleTime: 60_000 });
  const reports = (bookings.data ?? [])
    .flatMap((b) =>
      (b.reports ?? [])
        .filter((r) => r.isFullReport)
        .map((r) => ({ id: r.id, date: r.generatedAt, label: [...new Set(b.items.map((i) => i.testName))].join(', ') || 'Lab report' })),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 10);

  if (bookings.isLoading) return <Text style={styles.hint}>Looking for your DocNow lab reports…</Text>;
  if (!reports.length) return <Text style={styles.hint}>No DocNow lab reports yet. You can show other reports to the doctor on the call.</Text>;
  return (
    <View style={styles.reportList}>
      {reports.map((r) => {
        const on = selected.includes(r.id);
        const full = !on && selected.length >= MAX_REPORTS;
        return (
          <Pressable
            key={r.id}
            testID={`intake-report-${r.id}`}
            disabled={full}
            onPress={() => onToggle(r.id)}
            style={[styles.report, on && styles.reportOn, full && styles.dim]}
            accessibilityRole="checkbox"
            aria-checked={on}
            accessibilityState={{ checked: on, disabled: full }}>
            <Text style={styles.reportIcon}>{on ? '✓' : '📄'}</Text>
            <View style={styles.flex}>
              <Text style={styles.reportLabel} numberOfLines={1}>{r.label}</Text>
              <Text style={styles.hint}>{formatIstDay(r.date)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Journey A: booking for someone else. The family member's own phone (so they see the booking on
 * their phone and get the call link), their language, a quick health snapshot for the doctor,
 * reports to share, and whether the booker will co-join to assist. Saved on the person for next time.
 */
export function FamilyIntakeSheet({ person, value, onChange }: Props) {
  const [medicine, setMedicine] = useState('');
  const set = (patch: Partial<IntakeDraft>) => onChange({ ...value, ...patch });
  const first = person.name.trim().split(/\s+/)[0] || person.name;

  function addMedicine(name: string) {
    const clean = name.trim();
    if (!clean || value.currentMedications.some((m) => m.toLowerCase() === clean.toLowerCase())) return;
    set({ currentMedications: [...value.currentMedications, clean].slice(0, 20) });
    setMedicine('');
  }

  return (
    <View style={styles.card} testID="family-intake">
      <View style={styles.headRow}>
        <Text style={styles.title} accessibilityRole="header">About {first}</Text>
        <View style={styles.familyBadge}>
          <Text style={styles.familyBadgeText}>👪 Family care</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{first}&apos;s mobile number</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            testID="intake-phone"
            style={[styles.input, styles.flex]}
            value={value.phone}
            onChangeText={(t) => set({ phone: formatMobile(t) })}
            placeholder="98765 43210"
            placeholderTextColor={Colors.mutedForeground}
            keyboardType="phone-pad"
            maxLength={11}
            accessibilityLabel={`${first}'s mobile number`}
          />
        </View>
        <Text style={styles.hint}>
          {first} gets the call link on WhatsApp, and sees this booking in the DocNow app if they sign in with this number.
          {person.linkDeclinedAt ? ' Last time, this number said it was not them. Please check it.' : ''}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Language for {first}</Text>
        <View style={styles.chips}>
          <Chip testID="intake-lang-hi" label="हिन्दी (Hindi)" on={value.preferredLanguage === 'hi'} onPress={() => set({ preferredLanguage: 'hi' })} />
          <Chip testID="intake-lang-en" label="English" on={value.preferredLanguage === 'en'} onPress={() => set({ preferredLanguage: 'en' })} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Long-term conditions</Text>
        <View style={styles.chips}>
          {[...CONDITION_PRESETS, NONE].map((c) => (
            <Chip
              key={c}
              testID={`intake-condition-${c}`}
              label={c}
              on={value.chronicConditions.includes(c)}
              onPress={() => set({ chronicConditions: toggleChip(value.chronicConditions, c) })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Known drug allergies</Text>
        <View style={styles.chips}>
          {[...ALLERGY_PRESETS, NONE].map((a) => (
            <Chip key={a} testID={`intake-allergy-${a}`} label={a} on={value.allergies.includes(a)} onPress={() => set({ allergies: toggleChip(value.allergies, a) })} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Medicines {first} takes daily</Text>
        {value.currentMedications.length ? (
          <View style={styles.chips}>
            {value.currentMedications.map((m) => (
              <Chip key={m} label={`${m} ✕`} on onPress={() => set({ currentMedications: value.currentMedications.filter((x) => x !== m) })} />
            ))}
          </View>
        ) : null}
        <View style={styles.phoneRow}>
          <TextInput
            testID="intake-medicine"
            style={[styles.input, styles.flex]}
            value={medicine}
            onChangeText={setMedicine}
            onSubmitEditing={() => addMedicine(medicine)}
            returnKeyType="done"
            placeholder="e.g. Metformin 500mg"
            placeholderTextColor={Colors.mutedForeground}
            accessibilityLabel="Add a daily medicine"
          />
          <Pressable style={styles.addBtn} onPress={() => addMedicine(medicine)} accessibilityRole="button" accessibilityLabel="Add medicine">
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {MEDICINE_SUGGESTIONS.filter((m) => !value.currentMedications.includes(m)).map((m) => (
            <Chip key={m} label={`+ ${m}`} on={false} onPress={() => addMedicine(m)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Share reports with the doctor</Text>
        <ReportPicker
          selected={value.attachedReportIds}
          onToggle={(id) =>
            set({
              attachedReportIds: value.attachedReportIds.includes(id)
                ? value.attachedReportIds.filter((x) => x !== id)
                : [...value.attachedReportIds, id],
            })
          }
        />
      </View>

      <View style={styles.coJoin}>
        <View style={styles.flex}>
          <Text style={styles.coJoinTitle}>I will also join this video call to assist my family member</Text>
          <Text style={styles.hint}>You join from your phone; the doctor sees and hears you both.</Text>
        </View>
        <Switch
          testID="intake-cojoin"
          value={value.isCaregiverJoined}
          onValueChange={(on) => set({ isCaregiverJoined: on })}
          trackColor={{ true: Colors.primary, false: Colors.muted }}
          accessibilityLabel="I will also join this video call to assist my family member"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 16, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.primarySubtle, backgroundColor: Colors.card },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: Colors.foreground },
  familyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.primaryTint },
  familyBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.foreground },
  hint: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { fontSize: 15, fontWeight: '700', color: Colors.foreground, paddingHorizontal: 10, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.cardMuted },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.foreground, backgroundColor: Colors.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  chipTextOn: { color: Colors.primaryForeground },
  addBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.primaryTint },
  addBtnText: { fontWeight: '700', color: Colors.primary },
  reportList: { gap: 8 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  reportOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  reportIcon: { fontSize: 16, width: 20, textAlign: 'center', color: Colors.primary },
  reportLabel: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  dim: { opacity: 0.5 },
  coJoin: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  coJoinTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
