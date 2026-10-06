import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { TimeField } from '@/components/doctor/time-field';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { validateLeave } from '@/lib/consult/availability';
import { conflictMessage } from '@/lib/consult/leaveText';
import { formatIstDateTime } from '@/lib/consult/time';
import type { LeaveEntry } from '@/lib/consult/types';

const LEAVE_KEY = ['doctor', 'leave'] as const;

export function LeaveList() {
  const queryClient = useQueryClient();
  const leave = useQuery({ queryKey: LEAVE_KEY, queryFn: doctorApi.leave, staleTime: 0 });
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useUnsavedWarning(start !== '' || end !== '' || reason !== '');

  const add = useMutation({
    mutationFn: (body: { startsAt: string; endsAt: string; reason?: string }) => doctorApi.addLeave(body),
    onSuccess: (res) => {
      setConflicts(res.bookedConflicts);
      setStart('');
      setEnd('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: LEAVE_KEY });
    },
    onError: (e) => setFormError(friendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => doctorApi.removeLeave(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEAVE_KEY }),
    onError: (e) => setRemoveError(friendlyError(e)),
  });

  const submit = () => {
    setFormError(null);
    setConflicts(null);
    if (reason.trim().length > 200) return setFormError('Keep the reason under 200 characters.');
    const range = validateLeave(start, end);
    if ('error' in range) return setFormError(range.error);
    add.mutate({ ...range, ...(reason.trim() ? { reason: reason.trim() } : {}) });
  };

  const confirmRemove = (l: LeaveEntry) => {
    Alert.alert('Remove this leave?', `${formatIstDateTime(l.startsAt)} to ${formatIstDateTime(l.endsAt)}`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setRemoveError(null); remove.mutate(l.id); } },
    ]);
  };

  const entries = [...(leave.data ?? [])].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.heading} accessibilityRole="header">Add leave</Text>
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <TimeField label="From (Indian time)" mode="datetime" value={start} onChange={setStart} />
          <TimeField label="Until (Indian time)" mode="datetime" value={end} onChange={setEnd} />
          <View style={styles.field}>
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              maxLength={200}
              accessibilityLabel="Reason (optional)"
            />
          </View>
          <ActionButton label="Add leave" busyLabel="Adding..." busy={add.isPending} onPress={submit} />
          {conflicts !== null ? <Notice tone={conflicts > 0 ? 'warning' : 'success'}>{conflictMessage(conflicts)}</Notice> : null}
        </Card>

        <Text style={styles.heading} accessibilityRole="header">Your leave</Text>
        {removeError ? <Notice tone="error">{removeError}</Notice> : null}
        {leave.isLoading ? (
          <LoadingBlock label="Loading your leave" />
        ) : leave.error ? (
          <ErrorState message={friendlyError(leave.error)} onRetry={() => void leave.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState title="No leave planned" body="Add leave above and patients will not be able to book you in that time." />
        ) : (
          entries.map((l) => (
            <Card key={l.id}>
              <Text style={styles.when}>{formatIstDateTime(l.startsAt)} to {formatIstDateTime(l.endsAt)}</Text>
              {l.reason ? <Text style={styles.hint}>{l.reason}</Text> : null}
              <ActionButton
                label="Remove"
                variant="danger"
                busy={remove.isPending && remove.variables === l.id}
                busyLabel="Removing..."
                onPress={() => confirmRemove(l)}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  field: { gap: 4 },
  label: { fontWeight: '600', color: Colors.foreground, fontSize: 13 },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: Colors.foreground },
  when: { fontWeight: '600', color: Colors.foreground },
  hint: { color: Colors.mutedForeground },
});
