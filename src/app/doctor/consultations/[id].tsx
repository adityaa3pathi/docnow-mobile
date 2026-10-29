import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { reportsApi } from '@/lib/tests/api';
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

function Tags({ items, warn }: { items: string[]; warn?: boolean }) {
  return (
    <View style={styles.tags}>
      {items.map((x) => (
        <View key={x} style={[styles.tag, warn && styles.tagWarn]}>
          <Text style={[styles.tagText, warn && styles.tagTextWarn]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

function PreCallSummary({ record }: { record: DoctorConsultationRecord }) {
  const note = record.note;
  const p = record.patient;
  const conditions = p.chronicConditions ?? [];
  const allergies = p.allergies ?? [];
  const medicines = p.currentMedications ?? [];
  const reports = record.attachedReports ?? [];
  const hasIntake = conditions.length + allergies.length + medicines.length > 0 || !!p.bloodGroup;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">Pre-call summary</Text>
      {record.caregiver ? (
        <View style={styles.caregiver} testID="dossier-caregiver">
          <Text style={styles.caregiverText}>
            👪 Booked by {record.caregiver.name} (patient is their {record.caregiver.relation.toLowerCase()}).{' '}
            {record.caregiver.joinedAt ? 'They are in the call to assist.' : record.caregiver.coJoining ? 'They plan to join to assist.' : 'They are not joining.'}
            {p.preferredLanguage === 'hi' ? ' Prefers Hindi.' : ''}
          </Text>
        </View>
      ) : null}
      {conditions.length ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Conditions</Text>
          <Tags items={conditions} />
        </View>
      ) : null}
      {allergies.length ? (
        <View style={styles.row}>
          <Text style={[styles.rowLabel, styles.warnLabel]}>Allergies</Text>
          <Tags items={allergies} warn />
        </View>
      ) : null}
      {medicines.length ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Current medicines</Text>
          <Tags items={medicines} />
        </View>
      ) : null}
      {p.bloodGroup ? <Row label="Blood group" value={p.bloodGroup} /> : null}
      {reports.length ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Shared reports</Text>
          {reports.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => void WebBrowser.openBrowserAsync(reportsApi.publicUrl(r.viewToken))}
              accessibilityRole="link"
              accessibilityLabel={`Open report ${r.label}`}>
              <Text style={styles.reportLink}>📄 {r.label} · {formatIstDay(r.date)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Row
        label="Chief complaint"
        value={note?.complaints || 'Not recorded yet. Ask at the start of the call.'}
        muted={!note?.complaints}
      />
      {note?.findings ? <Row label="Examination" value={note.findings} /> : null}
      {note?.diagnosis ? <Row label="Working diagnosis" value={note.diagnosis} /> : null}
      {!hasIntake ? (
        <View style={styles.intakeNote}>
          <Text style={styles.intakeText}>
            ⚠️ No medical history or allergies were shared at booking. Confirm allergies and current medicines verbally
            before prescribing.
          </Text>
        </View>
      ) : null}
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
  caregiver: { padding: 10, borderRadius: Radius.md, backgroundColor: Colors.primaryTint },
  caregiverText: { fontSize: 13, color: Colors.foreground, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.cardMuted },
  tagWarn: { backgroundColor: Colors.destructiveTint },
  tagText: { fontSize: 12, fontWeight: '700', color: Colors.foreground },
  tagTextWarn: { color: Colors.destructive },
  warnLabel: { color: Colors.destructive },
  reportLink: { fontSize: 14, fontWeight: '700', color: Colors.primary, paddingVertical: 4 },
  intakeNote: { padding: 10, borderRadius: Radius.md, backgroundColor: Colors.warningTint },
  intakeText: { fontSize: 12, color: '#92400e', lineHeight: 17 },
});
