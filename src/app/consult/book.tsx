import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddPersonSheet } from '@/components/consult/add-person-sheet';
import { BookingSummary } from '@/components/consult/booking-summary';
import { PersonPicker } from '@/components/consult/person-picker';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { consult, errorStatus, errorText, friendlyError, people as peopleApi, type Person } from '@/lib/consult/api';
import { mapCreateError } from '@/lib/consult/bookingFlow';
import { formatRupees } from '@/lib/consult/format';
import { sortPeople } from '@/lib/consult/people';
import { forgetKey, keyFor, loadActiveBooking, saveActiveBooking } from '@/lib/consult/store';
import { serverNow } from '@/lib/consult/time';
import type { DoctorPublicProfile, Slot } from '@/lib/consult/types';

export default function BookScreen() {
  const { doctorId, slotId } = useLocalSearchParams<{ doctorId?: string; slotId?: string }>();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [doctor, setDoctor] = useState<DoctorPublicProfile | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [personId, setPersonId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; myLink?: boolean } | null>(null);

  const backToDoctor = useCallback(
    (notice: string) => {
      if (doctorId) router.replace({ pathname: '/consult/doctor/[id]', params: { id: doctorId, notice } });
      else router.replace('/');
    },
    [doctorId],
  );

  useEffect(() => {
    if (!userId) return;
    if (!doctorId || !slotId) {
      router.replace('/');
      return;
    }
    let alive = true;
    (async () => {
      // The same slot already has a saved booking, so go back to it instead of starting again.
      const saved = await loadActiveBooking();
      if (!alive) return;
      if (saved && saved.userId === userId && saved.slotId === slotId) {
        router.replace({ pathname: '/consult/booking/[id]', params: { id: saved.id } });
        return;
      }
      try {
        // A thin profile can not make a Self person, and that is fine to skip.
        try {
          await peopleApi.ensureSelf();
        } catch {
          // The saved list below still loads.
        }
        const [d, slots, list] = await Promise.all([consult.doctor(doctorId), consult.slots(doctorId), peopleApi.list()]);
        if (!alive) return;
        const found = slots.find((s) => s.id === slotId);
        if (!found || Date.parse(found.startsAt) <= serverNow()) {
          backToDoctor('slot_gone');
          return;
        }
        const sorted = sortPeople(list);
        setDoctor(d);
        setSlot(found);
        setPeople(sorted);
        setPersonId((cur) => cur || sorted[0]?.id || '');
      } catch (e) {
        if (!alive) return;
        if (errorStatus(e) === 404) backToDoctor('slot_gone');
        else setLoadError(friendlyError(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, doctorId, slotId, backToDoctor, attempt]);

  async function pay() {
    if (!slot || !personId || !userId || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const key = await keyFor(slot.id, personId);
      const res = await consult.createBooking({ slotId: slot.id, patientId: personId, idempotencyKey: key });
      await saveActiveBooking({ id: res.consultationId, slotId: slot.id, patientId: personId, userId });
      // Replace, so back never returns to this screen.
      router.replace({ pathname: '/consult/booking/[id]', params: { id: res.consultationId, pay: '1' } });
    } catch (e) {
      const action = mapCreateError(errorStatus(e), errorText(e));
      if (action.forgetKey) await forgetKey(slot.id, personId);
      const message = friendlyError(e);
      if (action.kind === 'slot_taken') backToDoctor('slot_taken');
      else if (action.kind === 'login') {
        setProblem({ message: 'Your session ended. Please log in again.' });
        void signOut();
      } else if (action.kind === 'too_many') setProblem({ message, myLink: true });
      else if (action.kind === 'busy') setProblem({ message: 'The payment service is busy. Please try again in a moment.' });
      else if (action.kind === 'ended') setProblem({ message: 'That booking ended. Press Pay to start a fresh one.' });
      else setProblem({ message });
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <View style={styles.pad}>
        <ErrorState message={loadError} onRetry={() => { setLoadError(null); setAttempt((n) => n + 1); }} />
      </View>
    );
  }
  if (!doctor || !slot || !people) return <LoadingBlock label="Getting your booking ready" />;

  const fee = formatRupees(doctor.consultationFee);
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.flex}>
      <Text style={styles.h1} accessibilityRole="header">Review and pay</Text>
      <BookingSummary doctorName={doctor.displayName} specialty={doctor.specialty.name} startsAt={slot.startsAt} endsAt={slot.endsAt} amount={fee} />

      <View style={styles.card}>
        <PersonPicker people={people} value={personId} onChange={setPersonId} onAdd={() => setAddOpen(true)} />
      </View>

      {problem ? (
        <View style={styles.problem} accessibilityRole="alert">
          <Text style={styles.problemText}>{problem.message}</Text>
          {problem.myLink ? (
            <Pressable onPress={() => router.push('/consult/my')} accessibilityRole="link" accessibilityLabel="Go to My consultations">
              <Text style={styles.problemLink}>Go to My consultations</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.button, (!personId || busy) && styles.disabled]}
        disabled={!personId || busy}
        onPress={pay}
        accessibilityRole="button"
        accessibilityLabel={busy ? 'Getting your payment ready' : `Pay ${fee}`}
        accessibilityState={{ disabled: !personId || busy, busy }}>
        {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.buttonText}>Pay {fee}</Text>}
      </Pressable>
      <Text style={styles.note}>Your time is held for a few minutes while you pay.</Text>

      <AddPersonSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(p) => {
          setPeople((cur) => sortPeople([...(cur ?? []), p]));
          setPersonId(p.id);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: 16 },
  content: { padding: 16, gap: 16 },
  h1: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  card: { padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted },
  problem: { gap: 6, padding: 14, borderRadius: Radius.lg, backgroundColor: '#fef2f2' },
  problemText: { color: Colors.destructive, fontWeight: '600' },
  problemLink: { color: Colors.destructive, fontWeight: '700', textDecorationLine: 'underline' },
  button: { alignItems: 'center', padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  buttonText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  note: { textAlign: 'center', fontSize: 12, color: Colors.mutedForeground },
});
