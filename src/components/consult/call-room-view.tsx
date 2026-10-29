import React from 'react';
import { Modal, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';

export interface Props {
  visible: boolean;
  url: string;
  token: string;
  role: string;
  consultationId?: string;
  otherPartyName?: string;
  onLeave: () => void;
}

let LiveRoomComponent: React.ComponentType<Props> | null = null;
if (NativeModules && NativeModules.WebRTCModule) {
  try {
    // Loaded only when WebRTC native module exists (e.g. standalone/dev build)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveRoomComponent = require('./call-room-livekit').CallRoomLiveKit;
  } catch {
    LiveRoomComponent = null;
  }
}

export function CallRoomView(props: Props) {
  const insets = useSafeAreaInsets();

  if (!props.visible) return null;

  if (LiveRoomComponent) {
    return <LiveRoomComponent {...props} />;
  }

  // Graceful fallback screen when running inside Expo Go
  return (
    <Modal visible={props.visible} animationType="slide" transparent={false} onRequestClose={props.onLeave}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>📹</Text>
          <Text style={styles.title}>Live Video Consultation</Text>
          <Text style={styles.sub}>
            WebRTC video calling requires a standalone or development build (
            <Text style={{ fontWeight: '700' }}>npx expo run:android</Text>
            ). Native WebRTC drivers are not bundled inside Expo Go.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Appointment Connected</Text>
            <Text style={styles.infoText}>Consultation with: {props.otherPartyName || 'Doctor'}</Text>
            <Text style={styles.infoText}>Role: {props.role}</Text>
          </View>

          <Pressable style={styles.closeBtn} onPress={props.onLeave}>
            <Text style={styles.closeBtnText}>Return to Appointment</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.md,
    padding: 14,
    width: '100%',
    marginTop: 18,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.foreground,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
