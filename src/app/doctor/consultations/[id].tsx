import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { CallRoomView } from '@/components/consult/call-room-view';
import { PrescriptionView } from '@/components/consult/prescription-view';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { PrescriptionPad, type IssuedResult } from '@/components/doctor/prescription-pad';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { NotificationPrompt } from '@/components/notifications/notification-prompt';
import { Colors, Radius } from '@/constants/theme';
import { useAppActive } from '@/hooks/use-app-active';
import { doctor, friendlyError } from '@/lib/consult/api';
import {
  canWritePrescription,
  patientWaiting,
  presencePollMs,
  primaryAction,
  workspaceBadge,
} from '@/lib/consult/doctorWorkspace';
import { formatIstDay, formatIstTime, serverNow } from '@/lib/consult/time';
import type { DoctorConsultationRecord, JoinResponse } from '@/lib/consult/types';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';

type Note = { tone: 'info' | 'success' | 'warning' | 'error'; text: string };

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowMuted]}>{value}</Text>
    </View>
  );
}

function PreCallSummary({ record }: { record: DoctorConsultationRecord }) {
  const note = record.note;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">Pre-call summary</Text>
      <Row
        label="Chief complaint"
        value={note?.complaints || 'Not recorded yet. Ask at the start of the call.'}
        muted={!note?.complaints}
      />
      {note?.findings ? <Row label="Examination" value={note.findings} /> : null}
      {note?.diagnosis ? <Row label="Working diagnosis" value={note.diagnosis} /> : null}
      <View style={styles.intakeNote}>
        <Text style={styles.intakeText}>
          ⚠️ Medical history, allergies and documents are not collected at booking yet. Confirm allergies and current
          medicines verbally before prescribing.
        </Text>
      </View>
    </View>
  );
}

export default function DoctorConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [call, setCall] = useState<JoinResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [completeAfterCall, setCompleteAfterCall] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [now, setNow] = useState(() => serverNow());
  const inCall = call !== null;

  const query = useQuery({
    queryKey: ['doctor', 'consultation', id],
    queryFn: () => doctor.consultation(id),
    enabled: !!id,
    refetchInterval: (q) => presencePollMs(q.state.data, inCall),
  });
  const record = query.data;
  const { refetch } = query;

  useAppActive(() => void refetch());

  // The join button depends on the clock, so the page re-reads it every 15 seconds.
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 15_000);
    return () => clearInterval(t);
  }, []);

  // A gentle buzz the moment the patient walks into the room while the doctor is elsewhere on the page.
  const waiting = record ? patientWaiting(record, inCall) : false;
  const wasWaiting = useRef(waiting);
  useEffect(() => {
    if (waiting && !wasWaiting.current) hapticNotify(NotificationFeedbackType.Warning);
    wasWaiting.current = waiting;
  }, [waiting]);

  const refreshLists = () => void queryClient.invalidateQueries({ queryKey: ['doctor', 'consultations'] });

  async function join() {
    setJoining(true);
    setNote(null);
    try {
      const res = await doctor.join(id);
      hapticImpact(ImpactFeedbackStyle.Medium);
      setCall(res);
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setNote({ tone: 'error', text: friendlyError(e) });
    } finally {
      setJoining(false);
    }
  }

  async function complete(): Promise<boolean> {
    setEnding(true);
    try {
      await doctor.end(id);
      hapticNotify(NotificationFeedbackType.Success);
      setNote({ tone: 'success', text: 'Consultation marked complete.' });
      return true;
    } catch (e) {
      setNote({ tone: 'warning', text: friendlyError(e) });
      return false;
    } finally {
      setEnding(false);
      void refetch();
      refreshLists();
    }
  }

  function leaveCall() {
    setCall(null);
    void refetch();
    refreshLists();
    if (completeAfterCall) {
      setCompleteAfterCall(false);
      void complete();
    }
  }

  function handleIssued(result: IssuedResult) {
    if (inCall) {
      setCompleteAfterCall(true);
      setNote({ tone: 'success', text: 'Prescription issued. The visit is marked complete when you end the call.' });
    } else if (result.completed) {
      setNote({ tone: 'success', text: 'Prescription issued and consultation completed.' });
    } else if (result.completeError) {
      setNote({ tone: 'warning', text: `Prescription issued. ${friendlyError(result.completeError)}` });
    } else {
      setNote({ tone: 'success', text: 'Prescription issued and sent to the patient.' });
    }
    setShowRx(true);
    void refetch();
    refreshLists();
  }

  const screen = <Stack.Screen options={{ title: record?.patient.name ?? 'Consultation' }} />;

  if (query.isLoading) return <LoadingBlock label="Loading consultation" />;
  if (!record) {
    return (
      <View style={styles.pad}>
        {screen}
        <ErrorState message={query.error ? friendlyError(query.error) : 'We could not load this consultation.'} onRetry={() => void refetch()} />
      </View>
    );
  }

  const badge = workspaceBadge(record, inCall);
  const action = primaryAction(record, now, inCall);
  const when = `${formatIstDay(record.startsAt)}, ${formatIstTime(record.startsAt)} – ${formatIstTime(record.slot.endsAt)} IST`;
  const upcoming = record.status === 'CONFIRMED' || record.status === 'WAITING';
  const canEnd = record.status === 'IN_PROGRESS' && !!record.patientJoinedAt && !inCall && !completeAfterCall;
  const callLabel = record.type === 'AUDIO' ? 'Audio' : 'Video';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
      {screen}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{record.patient.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} accessibilityRole="header">{record.patient.name}</Text>
            <Text style={styles.meta}>{record.patient.age} yrs · {record.patient.gender}</Text>
          </View>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </View>
        <Text style={styles.when}>{when}</Text>
        <Text style={styles.meta}>{callLabel} consultation</Text>
      </View>

      {waiting ? (
        <View style={styles.waitingBanner} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <View style={styles.liveDot} />
          <Text style={styles.waitingText}>{record.patient.name} is in the room and waiting for you</Text>
        </View>
      ) : upcoming && !record.patientJoinedAt ? (
        <Text style={styles.presenceIdle}>The patient has not joined yet. This page updates by itself.</Text>
      ) : null}

      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}

      {action.kind === 'join' ? (
        <ActionButton
          label={action.rejoin ? `Rejoin ${callLabel} Consultation` : `Join ${callLabel} Consultation`}
          busyLabel="Connecting..."
          busy={joining}
          onPress={() => void join()}
        />
      ) : null}
      {action.kind === 'opens-soon' ? (
        <View style={styles.opensSoon}>
          <Text style={styles.opensSoonText}>The room opens at {formatIstTime(action.opensAt)}. Join from here.</Text>
        </View>
      ) : null}
      {canEnd ? (
        <ActionButton label="Mark consultation complete" variant="soft" busy={ending} busyLabel="Completing..." onPress={() => void complete()} />
      ) : null}

      {upcoming ? (
        <NotificationPrompt
          title="Get alerted when your patient joins"
          body="Turn on notifications to hear a call alert the moment your patient enters the room."
        />
      ) : null}

      <PreCallSummary record={record} />

      {record.prescription ? (
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <Text style={styles.cardTitle}>Prescription v{record.prescription.version}</Text>
            <ActionButton label={showRx ? 'Hide' : 'View Issued Prescription'} variant="soft" onPress={() => setShowRx((s) => !s)} />
          </View>
          {showRx ? <PrescriptionView prescription={record.prescription} /> : null}
        </View>
      ) : canWritePrescription(record) && !inCall ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {record.status === 'COMPLETED' ? 'Update notes & write prescription' : 'Prescription pad'}
          </Text>
          <PrescriptionPad
            consultationId={record.id}
            initialNote={record.note}
            completeOnIssue={record.status === 'IN_PROGRESS' && !!record.patientJoinedAt}
            onIssued={handleIssued}
          />
        </View>
      ) : upcoming ? (
        <Text style={styles.presenceIdle}>The prescription pad opens once the call has started.</Text>
      ) : null}

      <CallRoomView
        visible={inCall}
        url={call?.url ?? ''}
        token={call?.token ?? ''}
        role={call?.role ?? 'doctor'}
        consultationId={record.id}
        otherPartyName={record.patient.name}
        onLeave={leaveCall}
        toolsLabel="Prescription pad"
        renderTools={({ publish }) =>
          record.prescription ? (
            <PrescriptionView prescription={record.prescription} />
          ) : (
            <PrescriptionPad
              consultationId={record.id}
              initialNote={record.note}
              publish={publish}
              completeOnIssue={false}
              onIssued={handleIssued}
            />
          )
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { flex: 1, padding: 16, backgroundColor: Colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { gap: 6, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  name: { fontSize: 18, fontWeight: '800', color: Colors.foreground },
  meta: { fontSize: 13, color: Colors.mutedForeground },
  when: { fontSize: 14, fontWeight: '700', color: Colors.foreground, marginTop: 4 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: Radius.lg, backgroundColor: Colors.successTint },
  liveDot: { width: 10, height: 10, borderRadius: Radius.full, backgroundColor: Colors.success },
  waitingText: { flex: 1, fontWeight: '700', color: '#166534' },
  presenceIdle: { fontSize: 13, color: Colors.mutedForeground, textAlign: 'center' },
  opensSoon: { padding: 14, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint, alignItems: 'center' },
  opensSoonText: { color: Colors.primary, fontWeight: '700' },
  card: { gap: 12, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.foreground },
  row: { gap: 2 },
  rowLabel: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: 14, color: Colors.foreground, lineHeight: 20 },
  rowMuted: { color: Colors.mutedForeground, fontStyle: 'italic' },
  intakeNote: { padding: 10, borderRadius: Radius.md, backgroundColor: Colors.warningTint },
  intakeText: { fontSize: 12, color: '#92400e', lineHeight: 17 },
});
