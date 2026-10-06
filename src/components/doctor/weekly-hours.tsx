import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/consult/states';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { TimeField } from '@/components/doctor/time-field';
import { Colors, Radius } from '@/constants/theme';
import { DOCTOR_ME_KEY, useDoctorMe } from '@/hooks/use-doctor-me';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { SLOT_OPTIONS, validateWeek, windowsToForm, type WeekForm } from '@/lib/consult/availability';
import { WEEKDAYS } from '@/lib/consult/time';
import type { DoctorMe } from '@/lib/consult/types';

export function WeeklyHours() {
  const { data: me } = useDoctorMe();
  if (!me) return null;
  return <HoursEditor me={me} />;
}

function HoursEditor({ me }: { me: DoctorMe }) {
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<WeekForm>(() => windowsToForm(me.availability));
  const [slotMinutes, setSlotMinutes] = useState(me.slotMinutes);
  const [saved, setSaved] = useState({ week: JSON.stringify(windowsToForm(me.availability)), slotMinutes: me.slotMinutes });
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);

  const dirty = useMemo(() => JSON.stringify(week) !== saved.week || slotMinutes !== saved.slotMinutes, [week, slotMinutes, saved]);
  useUnsavedWarning(dirty);

  const save = useMutation({
    mutationFn: (v: { windows: ReturnType<typeof validateWeek>['windows']; slotMinutes: number }) =>
      doctorApi.setAvailability(v.windows, v.slotMinutes),
    onSuccess: (result, v) => {
      queryClient.setQueryData<DoctorMe | null>(DOCTOR_ME_KEY, (old) => (old ? { ...old, availability: result, slotMinutes: v.slotMinutes } : old));
      const next = windowsToForm(result);
      setWeek(next);
      setSaved({ week: JSON.stringify(next), slotMinutes: v.slotMinutes });
      setDone(true);
    },
  });

  const edit = (fn: (draft: WeekForm) => void) => {
    setWeek((prev) => {
      const next = prev.map((d) => d.map((r) => ({ ...r })));
      fn(next);
      return next;
    });
    setDone(false);
  };

  const submit = () => {
    setDone(false);
    save.reset();
    const { errors, windows } = validateWeek(week);
    setDayErrors(errors);
    if (Object.keys(errors).length) return;
    save.mutate({ windows, slotMinutes });
  };

  const empty = week.every((d) => d.length === 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.heading} accessibilityRole="header">Length of each appointment</Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Length of each appointment">
          {SLOT_OPTIONS.map((m) => {
            const active = slotMinutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => { setSlotMinutes(m); setDone(false); }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="radio"
                accessibilityLabel={`${m} minutes`}
                accessibilityState={{ selected: active }}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>All times are Indian time.</Text>
      </Card>

      {empty ? <Notice tone="warning">No hours set yet. Patients cannot book you until you add hours.</Notice> : null}

      {WEEKDAYS.map((name, day) => (
        <Card key={name}>
          <Text style={styles.heading} accessibilityRole="header">{name}</Text>
          {week[day].length === 0 ? <Text style={styles.hint}>Not working</Text> : null}
          {week[day].map((range, i) => (
            <View key={i} style={styles.range}>
              <View style={styles.times}>
                <TimeField label="From" mode="time" value={range.start} onChange={(v) => edit((d) => { d[day][i].start = v; })} />
                <TimeField label="To" mode="time" value={range.end} onChange={(v) => edit((d) => { d[day][i].end = v; })} />
              </View>
              <ActionButton
                label="Remove"
                variant="danger"
                onPress={() => edit((d) => { d[day].splice(i, 1); })}
              />
            </View>
          ))}
          {dayErrors[day] ? <Notice tone="error">{dayErrors[day]}</Notice> : null}
          <ActionButton
            label={`Add hours on ${name}`}
            variant="soft"
            onPress={() => edit((d) => { d[day].push({ start: '09:00', end: '13:00' }); })}
          />
        </Card>
      ))}

      {save.error ? <ErrorState message={friendlyError(save.error)} /> : null}
      {done ? <Notice tone="success">Your hours are saved.</Notice> : null}
      <ActionButton label="Save hours" busyLabel="Saving..." busy={save.isPending} disabled={!dirty} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  hint: { color: Colors.mutedForeground, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.muted },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontWeight: '600', color: Colors.foreground },
  chipTextActive: { color: Colors.primaryForeground },
  range: { gap: 8, paddingVertical: 6 },
  times: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
});
