import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CallRoom } from '@/components/consult/call-room';
import { Colors, Radius, Type } from '@/constants/theme';
import { useServerNow } from '@/hooks/use-server-now';
import { friendlyError } from '@/lib/consult/api';
import { CONSENT_REQUIRED_HINT, consentText } from '@/lib/consult/consent';
import { joinWindow } from '@/lib/consult/room';
import { formatIstDateTime } from '@/lib/consult/time';
import type { ConsultationStatus, ConsultationType, JoinResponse } from '@/lib/consult/types';

interface Props {
  status: ConsultationStatus;
  type: ConsultationType;
  startsAt: string;
  endsAt: string;
  otherParty: 'doctor' | 'patient';
  join: () => Promise<JoinResponse>;
  /** Called after a successful join and after leaving, so the screen can reload the status. */
  onChange?: () => void;
  onCallChange?: (inCall: boolean) => void;
  /** Patient side: the NMC teleconsultation consent must be ticked before Join works. */
  consentDoctorName?: string;
}

/** Shows when the call opens, the Join button inside the window, then the call itself. */
export function JoinPanel({ status, type, startsAt, endsAt, otherParty, join, onChange, onCallChange, consentDoctorName }: Props) {
  const now = useServerNow();
  const [call, setCall] = useState<JoinResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [consented, setConsented] = useState(false);
  const needsConsent = consentDoctorName !== undefined && !consented;

  if (call) {
    return (
      <CallRoom
        key={`${call.token}-${attempt}`}
        url={call.url}
        token={call.token}
        role={call.role}
        otherParty={otherParty}
        onRetry={() => setAttempt((n) => n + 1)}
        onLeave={() => {
          setCall(null);
          onCallChange?.(false);
          onChange?.();
        }}
      />
    );
  }

  if (type === 'CHAT') return <Text style={styles.muted}>Chat consultations are not available yet.</Text>;

  const win = joinWindow({ status, startsAt, endsAt }, now);
  if (win.kind === 'not_joinable') return null;

  async function start() {
    if (needsConsent) return;
    setBusy(true);
    setError(null);
    try {
      setCall(await join());
      onCallChange?.(true);
      onChange?.();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{type === 'AUDIO' ? 'Audio call' : 'Video call'}</Text>
      {win.kind === 'early' ? <Text style={styles.muted}>Join from {formatIstDateTime(win.opensAt)} (Indian time).</Text> : null}
      {win.kind === 'ended' ? <Text style={styles.muted}>The time to join this call has passed.</Text> : null}
      {win.kind !== 'ended' && consentDoctorName !== undefined ? (
        <Pressable
          style={styles.consent}
          onPress={() => setConsented((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          accessibilityLabel={consentText(consentDoctorName)}>
          <View style={[styles.box, consented && styles.boxOn]}>{consented ? <Text style={styles.tick}>✓</Text> : null}</View>
          <Text style={styles.consentText}>{consentText(consentDoctorName)}</Text>
        </Pressable>
      ) : null}
      {win.kind === 'open' ? (
        <Pressable
          style={[styles.button, (busy || needsConsent) && styles.off]}
          disabled={busy || needsConsent}
          onPress={() => void start()}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Joining' : 'Join call'}
          accessibilityState={{ disabled: busy || needsConsent, busy }}>
          {busy ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.buttonText}>Join call</Text>}
        </Pressable>
      ) : null}
      {win.kind === 'open' && needsConsent ? <Text style={styles.hint}>{CONSENT_REQUIRED_HINT}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  title: { ...Type.bodyStrong, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: 16, borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonText: { ...Type.bodyStrong, color: Colors.onPrimary },
  off: { opacity: 0.5 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 24, height: 24, marginTop: 2, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tick: { ...Type.bodyStrong, color: Colors.onPrimary },
  consentText: { ...Type.small, flex: 1, color: Colors.ink },
  hint: { ...Type.small, textAlign: 'center', color: Colors.inkMuted },
  error: { ...Type.small, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft, color: Colors.dangerInk },
});
