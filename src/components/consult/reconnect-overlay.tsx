import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { ReconnectState } from '@/lib/consult/reconnectPolicy';

interface ReconnectOverlayProps {
  visible: boolean;
  reconnectState?: ReconnectState | null;
  onLeave: () => void;
}

function ReconnectModalContent({
  reconnectState,
  onLeave,
}: {
  reconnectState?: ReconnectState | null;
  onLeave: () => void;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const attempt = reconnectState?.attempt ?? 1;
  const maxAttempts = reconnectState?.maxAttempts ?? 5;
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.title}>Reconnecting...</Text>
        <Text style={styles.subtitle}>
          Unstable network detected. We are restoring your consultation audio and video.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              Attempt {attempt} of {maxAttempts}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatTime(elapsedSec)}</Text>
          </View>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, (attempt / maxAttempts) * 100)}%` },
            ]}
          />
        </View>

        <Pressable
          style={styles.leaveButton}
          onPress={onLeave}
          accessibilityRole="button"
          accessibilityLabel="Leave consultation">
          <Text style={styles.leaveText}>Leave Consultation</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ReconnectOverlay({ visible, reconnectState, onLeave }: ReconnectOverlayProps) {
  if (!visible) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <ReconnectModalContent reconnectState={reconnectState} onLeave={onLeave} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  leaveButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  leaveText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
