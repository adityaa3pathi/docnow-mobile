import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { joinWindow } from '@/lib/consult/room';
import { formatIstDateTime, serverNow } from '@/lib/consult/time';
import type { ConsultationStatus, ConsultationType, JoinResponse } from '@/lib/consult/types';

interface Props {
  status: ConsultationStatus;
  type?: ConsultationType;
  startsAt: string;
  endsAt: string;
  join: () => Promise<JoinResponse>;
  onJoined: (res: JoinResponse) => void;
}

export function JoinPanel({ status, type = 'VIDEO', startsAt, endsAt, join, onJoined }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (type === 'CHAT') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Chat Consultation</Text>
        <Text style={styles.subtext}>Chat consultations are not available yet.</Text>
      </View>
    );
  }

  const now = serverNow();
  const win = joinWindow({ status, startsAt, endsAt }, now);
  if (win.kind === 'not_joinable') return null;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await join();
      onJoined(res);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const callLabel = type === 'AUDIO' ? 'Audio call' : 'Video call';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{callLabel}</Text>
      {win.kind === 'early' ? (
        <Text style={styles.subtext}>Join from {formatIstDateTime(win.opensAt)} (Indian time).</Text>
      ) : null}
      {win.kind === 'ended' ? (
        <Text style={styles.subtext}>The time to join this call has passed.</Text>
      ) : null}
      {win.kind === 'open' ? (
        <Pressable
          style={[styles.button, busy && styles.disabled]}
          disabled={busy}
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel="Join call">
          {busy ? (
            <ActivityIndicator color={Colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Join call</Text>
          )}
        </Pressable>
      ) : null}
      {error ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.muted,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  subtext: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.primaryForeground,
    fontWeight: '700',
    fontSize: 15,
  },
  errorBox: {
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
});
