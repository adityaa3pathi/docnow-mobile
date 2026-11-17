import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { doctor, friendlyError } from '@/lib/consult/api';
import {
  addTest,
  COMPLAINT_PRESETS,
  DOSAGES,
  draftFromNote,
  draftKey,
  DURATIONS,
  FOOD_TIMINGS,
  isEmptyDraft,
  issueFromPad,
  LIMITS,
  MEDICINE_PRESETS,
  medicineError,
  parseDraft,
  serializeDraft,
  TEST_PRESETS,
  toggleComplaint,
  upsertMedicine,
  validatePad,
  type Dosage,
  type FoodTiming,
  type PadDraft,
  type PadMedicine,
} from '@/lib/consult/prescriptionPad';
import type { ConsultNote, ConsultRoomEvent, Prescription } from '@/lib/consult/types';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { catalogApi } from '@/lib/tests/api';

const AUTOSAVE_MS = 5_000;

export interface IssuedResult {
  prescription: Prescription;
  completed: boolean;
  completeError?: unknown;
}

interface Props {
  consultationId: string;
  /** Notes already saved on the server seed an empty pad. */
  initialNote?: ConsultNote | null;
  /** Present inside a live call: sends room events on the data channel. */
  publish?: (event: ConsultRoomEvent) => Promise<void>;
  /** Complete the consultation right after issuing. Off inside a call, since ending closes the room. */
  completeOnIssue: boolean;
  onIssued: (result: IssuedResult) => void;
}

interface Builder {
  editingId: string | null;
  name: string;
  dosage: Dosage;
  timing: FoodTiming;
  duration: string;
  customDuration: boolean;
}

const freshBuilder = (): Builder => ({ editingId: null, name: '', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', customDuration: false });
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const savedLabel = (ms: number) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms)).toUpperCase();

function Chip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={[styles.chip, selected && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/**
 * The doctor's writing surface. Works inline on the consultation page and inside the call's
 * bottom sheet. Everything typed is saved on this phone every 5 seconds, so a dropped call or a
 * closed app never loses a half-written prescription; the draft is deleted once issued.
 */
export function PrescriptionPad({ consultationId, initialNote, publish, completeOnIssue, onIssued }: Props) {
  const [draft, setDraft] = useState<PadDraft>(() => draftFromNote(initialNote ?? null));
  const [builder, setBuilder] = useState<Builder>(freshBuilder);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [complaintText, setComplaintText] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const latest = useRef(draft);
  const dirty = useRef(false);
  const loaded = useRef(false);
  const touched = useRef(false);
  const issued = useRef(false);
  const draftingSent = useRef(false);

  // Restore a local draft unless the doctor has already started typing.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(draftKey(consultationId))
      .then((raw) => {
        const saved = parseDraft(raw);
        if (alive && saved && !isEmptyDraft(saved) && !touched.current) {
          setDraft(saved);
          setRestored(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [consultationId]);

  useEffect(() => {
    latest.current = draft;
    dirty.current = true;
  }, [draft]);

  // Auto-save every 5 s, on backgrounding, and on leaving the screen.
  useEffect(() => {
    const key = draftKey(consultationId);
    const flush = () => {
      if (!loaded.current || !dirty.current || issued.current) return;
      dirty.current = false;
      const d = latest.current;
      const write = isEmptyDraft(d) ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, serializeDraft(d));
      write.then(() => setSavedAt(Date.now())).catch(() => {
        dirty.current = true;
      });
    };
    const timer = setInterval(flush, AUTOSAVE_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      flush();
    };
  }, [consultationId]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const results = useQuery({
    queryKey: ['catalog', 'rx-search', debounced],
    queryFn: () => catalogApi.products({ search: debounced, limit: 8 }),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  function update(fn: (d: PadDraft) => PadDraft) {
    touched.current = true;
    setErrors([]);
    setServerError(null);
    setDraft(fn);
    if (publish && !draftingSent.current) {
      draftingSent.current = true;
      publish({ v: 1, type: 'PRESCRIPTION_DRAFTING', consultationId }).catch(() => {});
    }
  }

  function addComplaint(text: string) {
    if (!text.trim()) return;
    hapticImpact(ImpactFeedbackStyle.Light);
    update((d) => ({ ...d, complaints: toggleComplaint(d.complaints, text) }));
  }

  function saveMedicine() {
    const err = medicineError(builder);
    if (err) {
      setBuilderError(err);
      hapticNotify(NotificationFeedbackType.Warning);
      return;
    }
    if (!builder.editingId && draft.medicines.length >= LIMITS.medicines) {
      setBuilderError(`A prescription can list at most ${LIMITS.medicines} medicines.`);
      return;
    }
    const med: PadMedicine = {
      id: builder.editingId ?? newId(),
      name: builder.name.trim(),
      dosage: builder.dosage,
      timing: builder.timing,
      duration: builder.duration.trim(),
    };
    hapticImpact(ImpactFeedbackStyle.Medium);
    update((d) => ({ ...d, medicines: upsertMedicine(d.medicines, med) }));
    setBuilder(freshBuilder());
    setBuilderError(null);
  }

  function editMedicine(m: PadMedicine) {
    hapticImpact(ImpactFeedbackStyle.Light);
    setBuilder({
      editingId: m.id,
      name: m.name,
      dosage: m.dosage,
      timing: m.timing,
      duration: m.duration,
      customDuration: !(DURATIONS as readonly string[]).includes(m.duration),
    });
    setBuilderError(null);
  }

  function removeMedicine(id: string) {
    hapticImpact(ImpactFeedbackStyle.Light);
    update((d) => ({ ...d, medicines: d.medicines.filter((m) => m.id !== id) }));
    if (builder.editingId === id) setBuilder(freshBuilder());
  }

  async function issue() {
    setBusy(true);
    setServerError(null);
    try {
      const outcome = await issueFromPad(consultationId, draft, {
        saveNotes: doctor.saveNotes,
        issue: doctor.issuePrescription,
        publish,
        complete: completeOnIssue ? doctor.end : undefined,
      });
      if (!outcome.ok) {
        setErrors(outcome.errors);
        hapticNotify(NotificationFeedbackType.Error);
        return;
      }
      issued.current = true;
      hapticNotify(NotificationFeedbackType.Success);
      AsyncStorage.removeItem(draftKey(consultationId)).catch(() => {});
      onIssued({ prescription: outcome.prescription, completed: outcome.completed, completeError: outcome.completeError });
    } catch (e) {
      setServerError(friendlyError(e, 'The prescription was not issued. Your draft is safe; please try again.'));
      hapticNotify(NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  function confirmIssue() {
    const problems = validatePad(draft);
    if (problems.length) {
      setErrors(problems);
      hapticNotify(NotificationFeedbackType.Warning);
      return;
    }
    Alert.alert(
      'Issue prescription?',
      'It is signed with your registration number and sent to the patient straight away. Later changes create a corrected version.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Issue', onPress: () => void issue() },
      ],
    );
  }

  const searchItems = results.data?.products ?? [];

  return (
    <View style={styles.pad} testID="prescription-pad">
      {restored ? <Notice tone="info">Restored your unsent draft from this phone.</Notice> : null}

      <Section title="Chief complaints" hint="Tap to add">
        <View style={styles.chips}>
          {COMPLAINT_PRESETS.map((c) => (
            <Chip key={c} label={c} selected={draft.complaints.includes(c)} onPress={() => addComplaint(c)} />
          ))}
          {draft.complaints
            .filter((c) => !(COMPLAINT_PRESETS as readonly string[]).includes(c))
            .map((c) => (
              <Chip key={c} label={`${c} ✕`} selected onPress={() => addComplaint(c)} />
            ))}
        </View>
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={complaintText}
            onChangeText={setComplaintText}
            placeholder="Other complaint, e.g. Dizziness"
            placeholderTextColor={Colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={() => {
              addComplaint(complaintText);
              setComplaintText('');
            }}
            accessibilityLabel="Add another complaint"
          />
          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              addComplaint(complaintText);
              setComplaintText('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Add complaint">
            <Text style={styles.smallBtnText}>Add</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Examination & diagnosis">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={draft.findings}
          onChangeText={(t) => update((d) => ({ ...d, findings: t }))}
          placeholder="Clinical examination findings (BP, temperature, observations)"
          placeholderTextColor={Colors.mutedForeground}
          multiline
          maxLength={LIMITS.findings}
          accessibilityLabel="Clinical examination findings"
        />
        <TextInput
          style={styles.input}
          value={draft.diagnosis}
          onChangeText={(t) => update((d) => ({ ...d, diagnosis: t }))}
          placeholder="Diagnosis, e.g. Acute viral pharyngitis"
          placeholderTextColor={Colors.mutedForeground}
          maxLength={LIMITS.diagnosis}
          accessibilityLabel="Diagnosis"
          testID="rx-diagnosis"
        />
      </Section>

      <Section title="Medicines" hint={`${draft.medicines.length}/${LIMITS.medicines}`}>
        {draft.medicines.map((m, i) => (
          <View key={m.id} style={[styles.medRow, builder.editingId === m.id && styles.medRowEditing]}>
            <Text style={styles.medIndex}>{i + 1}</Text>
            <View style={styles.flex}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medMeta}>{[m.dosage, m.timing, m.duration].join(' · ')}</Text>
            </View>
            <Pressable onPress={() => editMedicine(m)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${m.name}`}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => removeMedicine(m.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${m.name}`} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.builder}>
          <TextInput
            style={styles.input}
            value={builder.name}
            onChangeText={(t) => setBuilder((b) => ({ ...b, name: t }))}
            placeholder="Medicine name and strength"
            placeholderTextColor={Colors.mutedForeground}
            maxLength={LIMITS.medicineName}
            accessibilityLabel="Medicine name"
            testID="rx-medicine-name"
          />
          <View style={styles.chips}>
            {MEDICINE_PRESETS.map((name) => (
              <Chip key={name} label={name} selected={builder.name === name} onPress={() => setBuilder((b) => ({ ...b, name }))} />
            ))}
          </View>

          <Text style={styles.label}>Dosage</Text>
          <View style={styles.chips}>
            {DOSAGES.map((d) => (
              <Chip key={d} label={d} selected={builder.dosage === d} onPress={() => setBuilder((b) => ({ ...b, dosage: d }))} />
            ))}
          </View>

          <Text style={styles.label}>When</Text>
          <View style={styles.chips}>
            {FOOD_TIMINGS.map((t) => (
              <Chip key={t} label={t} selected={builder.timing === t} onPress={() => setBuilder((b) => ({ ...b, timing: t }))} />
            ))}
          </View>

          <Text style={styles.label}>Duration</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={!builder.customDuration && builder.duration === d}
                onPress={() => setBuilder((b) => ({ ...b, duration: d, customDuration: false }))}
              />
            ))}
            <Chip
              label="Custom"
              selected={builder.customDuration}
              onPress={() => setBuilder((b) => ({ ...b, customDuration: true, duration: b.customDuration ? b.duration : '' }))}
            />
          </View>
          {builder.customDuration ? (
            <TextInput
              style={styles.input}
              value={builder.duration}
              onChangeText={(t) => setBuilder((b) => ({ ...b, duration: t }))}
              placeholder="e.g. 10 Days, 1 Month, Until review"
              placeholderTextColor={Colors.mutedForeground}
              maxLength={LIMITS.duration}
              accessibilityLabel="Custom duration"
            />
          ) : null}

          {builderError ? <Text style={styles.errorText} accessibilityRole="alert">{builderError}</Text> : null}
          <View style={styles.inlineRow}>
            <View style={styles.flex}>
              <ActionButton label={builder.editingId ? 'Save changes' : '+ Add medicine'} variant="soft" onPress={saveMedicine} />
            </View>
            {builder.editingId ? (
              <Pressable onPress={() => setBuilder(freshBuilder())} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel edit">
                <Text style={styles.link}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Section>

      <Section title="Recommended tests" hint={`${draft.tests.length}/${LIMITS.tests}`}>
        {draft.tests.length ? (
          <View style={styles.chips}>
            {draft.tests.map((t) => (
              <Chip
                key={t.code}
                label={`${t.name} ✕`}
                selected
                onPress={() => update((d) => ({ ...d, tests: d.tests.filter((x) => x.code !== t.code) }))}
              />
            ))}
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search DocNow lab catalog, e.g. CBC"
          placeholderTextColor={Colors.mutedForeground}
          autoCorrect={false}
          accessibilityLabel="Search lab tests"
        />
        <View style={styles.chips}>
          {TEST_PRESETS.map((t) => (
            <Chip key={t} label={t} selected={debounced.toLowerCase() === t.toLowerCase()} onPress={() => setSearch(t)} />
          ))}
        </View>
        {debounced.length >= 2 ? (
          <View style={styles.results}>
            {results.isFetching && !searchItems.length ? <ActivityIndicator color={Colors.primary} style={styles.resultsSpinner} /> : null}
            {results.isError ? <Text style={styles.errorText}>Could not search the catalog. Check your connection.</Text> : null}
            {!results.isFetching && !results.isError && !searchItems.length ? (
              <Text style={styles.hint}>No tests match &ldquo;{debounced}&rdquo;.</Text>
            ) : null}
            {searchItems.map((item) => {
              const added = draft.tests.some((t) => t.code === item.partnerCode);
              const full = draft.tests.length >= LIMITS.tests;
              return (
                <View key={item.partnerCode} style={styles.resultRow}>
                  <View style={styles.flex}>
                    <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.hint}>{[item.type, item.parameters].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Pressable
                    disabled={added || full}
                    onPress={() => {
                      hapticImpact(ImpactFeedbackStyle.Light);
                      update((d) => ({ ...d, tests: addTest(d.tests, { code: item.partnerCode, name: item.name }) }));
                    }}
                    style={[styles.addBtn, added ? styles.addBtnAdded : full && styles.addBtnOff]}
                    accessibilityRole="button"
                    accessibilityLabel={added ? `${item.name} added` : `Recommend ${item.name}`}>
                    <Text style={[styles.addBtnText, added && styles.addedText]}>{added ? 'Added ✓' : '+ Add'}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
      </Section>

      <Section title="Advice">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={draft.advice}
          onChangeText={(t) => update((d) => ({ ...d, advice: t }))}
          placeholder="Diet, rest, warning signs, follow-up"
          placeholderTextColor={Colors.mutedForeground}
          multiline
          maxLength={LIMITS.advice}
          accessibilityLabel="Advice for the patient"
        />
      </Section>

      {errors.length ? (
        <View style={styles.errorBox} accessibilityRole="alert" testID="rx-errors">
          {errors.map((e) => (
            <Text key={e} style={styles.errorText}>• {e}</Text>
          ))}
        </View>
      ) : null}
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}

      <ActionButton label="Issue Prescription" busyLabel="Issuing..." busy={busy} onPress={confirmIssue} />
      <Text style={styles.savedLine}>
        {savedAt ? `Draft auto-saved on this phone at ${savedLabel(savedAt)}` : 'Your draft auto-saves on this phone every few seconds'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 18 },
  flex: { flex: 1 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.foreground },
  hint: { fontSize: 12, color: Colors.mutedForeground },
  label: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  chipTextOn: { color: Colors.primaryForeground },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.foreground,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.primaryTint },
  smallBtnText: { fontWeight: '700', color: Colors.primary },
  builder: { gap: 10, padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primarySubtle, backgroundColor: Colors.primaryTint },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  medRowEditing: { borderColor: Colors.primary },
  medIndex: { width: 22, height: 22, borderRadius: Radius.full, backgroundColor: Colors.primarySubtle, color: Colors.primary, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '800' },
  medName: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  medMeta: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },
  link: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  deleteBtn: { width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.destructiveTint },
  deleteText: { color: Colors.destructive, fontWeight: '800' },
  results: { gap: 8 },
  resultsSpinner: { paddingVertical: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  resultName: { fontSize: 13, fontWeight: '700', color: Colors.foreground },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md, backgroundColor: Colors.primary },
  addBtnAdded: { backgroundColor: Colors.successTint },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 12 },
  addedText: { color: Colors.success },
  errorBox: { gap: 4, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.destructiveTint },
  errorText: { color: Colors.destructive, fontSize: 13, fontWeight: '600' },
  savedLine: { fontSize: 12, color: Colors.mutedForeground, textAlign: 'center' },
});
