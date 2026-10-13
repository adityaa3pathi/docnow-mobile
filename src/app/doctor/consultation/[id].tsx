import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { JoinPanel } from '@/components/consult/join-panel';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { IssuedPrescription } from '@/components/doctor/issued-prescription';
import { NotesForm } from '@/components/doctor/notes-form';
import { PrescriptionBuilder } from '@/components/doctor/prescription-builder';
import { ActionButton, Card, Notice } from '@/components/doctor/ui';
import { Colors } from '@/constants/theme';
import { useAppActive } from '@/hooks/use-app-active';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { doctorStatusLabel } from '@/lib/consult/doctorConsultations';
import { shouldWatchForPatient } from '@/lib/consult/room';
import { canWrite, notesLock } from '@/lib/consult/roomText';
import { formatIstDateTime, formatIstTime } from '@/lib/consult/time';

const WATCH_MS = 10_000;

export default function DoctorConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [inCall, setInCall] = useState(false);
  // Bumped after ending, so the call panel remounts and its cleanup leaves the room.
  const [callKey, setCallKey] = useState(0);
  const [correcting, setCorrecting] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // Re-checks so the doctor sees the patient arrive. Re-evaluated after each read, so it
  // stops once the app is in the background and starts again from the refetch on return.
  const q = useQuery({
    queryKey: ['doctor', 'consultation', id],
    queryFn: () => doctorApi.consultation(id),
    staleTime: 0,
    refetchInterval: (query) => {
      const r = query.state.data;
      return AppState.currentState === 'active' && r && shouldWatchForPatient(r.status, inCall) ? WATCH_MS : false;
    },
  });
  const { refetch } = q;
  useAppActive(() => void refetch());
  const record = q.data;
  const watching = !!record && shouldWatchForPatient(record.status, inCall);

  const refresh = () => {
    void q.refetch();
    void queryClient.invalidateQueries({ queryKey: ['doctor', 'consultations'] });
  };

  const end = useMutation({
    mutationFn: () => doctorApi.end(id),
    onSuccess: () => {
      setCallKey((k) => k + 1);
      setInCall(false);
      refresh();
    },
    onError: (e) => setEndError(friendlyError(e)),
  });

  const confirmEnd = () => {
    Alert.alert(
      'End this consultation?',
      'The call is marked as finished and cannot be joined again. You can still write notes and issue the prescription afterwards.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End consultation', style: 'destructive', onPress: () => { setEndError(null); end.mutate(); } },
      ],
    );
  };

  if (q.isLoading) return <LoadingBlock label="Loading consultation" />;
  if (!record) {
    return <View style={styles.pad}><ErrorState message={friendlyError(q.error, 'We could not load this consultation.')} onRetry={() => void q.refetch()} /></View>;
  }

  const status = doctorStatusLabel(record.status);
  const { patient } = record;
  const when = `${formatIstDateTime(record.startsAt)} to ${formatIstTime(record.slot.endsAt)} IST`;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={q.isRefetching && !watching} onRefresh={() => void q.refetch()} tintColor={Colors.primary} />}>
        <Card>
          <View style={styles.top}>
            <Text style={styles.name} accessibilityRole="header">{patient.name}</Text>
            <Badge tone={status.tone}>{status.label}</Badge>
          </View>
          <Text style={styles.muted}>{patient.age} years · {patient.gender}</Text>
          <Text style={styles.when}>{when}</Text>
          {watching && record.patientJoinedAt ? (
            <View accessibilityLiveRegion="polite"><Badge tone="success">Patient is waiting</Badge></View>
          ) : null}
        </Card>
        <JoinPanel
          key={callKey}
          status={record.status}
          type={record.type}
          startsAt={record.startsAt}
          endsAt={record.slot.endsAt}
          otherParty="patient"
          join={() => doctorApi.join(record.id)}
          onChange={refresh}
          onCallChange={setInCall}
        />
        {record.status === 'IN_PROGRESS' ? (
          <ActionButton label="End consultation" busyLabel="Ending..." variant="danger" busy={end.isPending} onPress={confirmEnd} />
        ) : null}
        {endError ? <Notice tone="error">{endError}</Notice> : null}
        <NotesForm key={record.id} consultationId={record.id} note={record.note} lockedReason={notesLock(record)} />
        {record.prescription && correcting ? (
          <PrescriptionBuilder
            key={record.prescription.id}
            consultationId={record.id}
            correcting={record.prescription}
            onCancel={() => setCorrecting(false)}
            onIssued={() => {
              setCorrecting(false);
              void q.refetch();
            }}
          />
        ) : record.prescription ? (
          <IssuedPrescription
            consultationId={record.id}
            prescription={record.prescription}
            previousVersions={record.previousVersions}
            onCorrect={() => setCorrecting(true)}
          />
        ) : canWrite(record.status) ? (
          <PrescriptionBuilder consultationId={record.id} onIssued={() => void q.refetch()} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  when: { fontWeight: '600', color: Colors.foreground },
});
