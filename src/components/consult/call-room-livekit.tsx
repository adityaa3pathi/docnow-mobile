import {
  LiveKitRoom,
  registerGlobals,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from '@livekit/react-native';
import * as Haptics from 'expo-haptics';
import { ConnectionState, DisconnectReason, Track } from 'livekit-client';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { type ReconnectState, ObservableReconnectPolicy } from '@/lib/consult/reconnectPolicy';
import { CONNECT_OPTIONS, buildRoomOptions } from '@/lib/consult/roomOptions';
import { useDoctorPresence } from '@/lib/consult/useDoctorPresence';
import { useNetworkAdaptation } from '@/lib/consult/useNetworkAdaptation';
import { NetworkBanner } from './network-banner';
import { PatientPrescription } from './patient-prescription';
import { ReconnectOverlay } from './reconnect-overlay';

try {
  registerGlobals();
} catch {
  // WebRTC globals
}

export interface Props {
  visible: boolean;
  url: string;
  token: string;
  role: string;
  consultationId?: string;
  otherPartyName?: string;
  onLeave: () => void;
}

function RoomControls({
  onLeave,
  audioOnly,
}: {
  onLeave: () => void;
  audioOnly: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const insets = useSafeAreaInsets();

  const isMicOn = localParticipant.isMicrophoneEnabled;
  const isCamOn = localParticipant.isCameraEnabled;

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicOn);
    } catch {
      // Ignore
    }
  };

  const toggleCam = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCamOn);
    } catch {
      // Ignore
    }
  };

  return (
    <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Pressable
        style={[styles.ctrlBtn, !isMicOn && styles.ctrlBtnOff]}
        onPress={toggleMic}
        accessibilityRole="button"
        accessibilityLabel={isMicOn ? 'Mute microphone' : 'Unmute microphone'}>
        <Text style={styles.ctrlText}>{isMicOn ? '🎤' : '🔇'}</Text>
      </Pressable>

      {!audioOnly && (
        <Pressable
          style={[styles.ctrlBtn, !isCamOn && styles.ctrlBtnOff]}
          onPress={toggleCam}
          accessibilityRole="button"
          accessibilityLabel={isCamOn ? 'Turn camera off' : 'Turn camera on'}>
          <Text style={styles.ctrlText}>{isCamOn ? '📹' : '🚫'}</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.ctrlBtn, styles.leaveBtn]}
        onPress={async () => {
          try {
            await room.disconnect();
          } finally {
            onLeave();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="End consultation">
        <Text style={styles.ctrlText}>📞</Text>
      </Pressable>
    </View>
  );
}

function Stage({
  otherPartyName,
  audioOnly,
  isSplit,
}: {
  otherPartyName?: string;
  audioOnly: boolean;
  isSplit?: boolean;
}) {
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const presence = useDoctorPresence(otherPartyName);

  const remoteVideoTrack = tracks.find(
    (t) => t.participant.identity !== 'local' && t.publication.isSubscribed && t.publication.track,
  );

  const localVideoTrack = tracks.find(
    (t) => t.participant.identity === 'local' && t.publication.track,
  );

  if (connectionState === ConnectionState.Connecting) {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.statusEmoji}>⏳</Text>
        <Text style={styles.statusText}>Connecting to consultation room...</Text>
      </View>
    );
  }

  if (presence.status === 'waiting' || remoteParticipants.length === 0) {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.statusEmoji}>👨‍⚕️</Text>
        <Text style={styles.statusText}>
          Waiting for {otherPartyName || 'the doctor'} to join...
        </Text>
        <Text style={styles.statusSub}>You will see and hear them as soon as they enter.</Text>
      </View>
    );
  }

  if (presence.status === 'disconnected') {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.statusEmoji}>👋</Text>
        <Text style={styles.statusText}>{presence.statusMessage}</Text>
        <Text style={styles.statusSub}>The consultation has ended.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.stage, isSplit && styles.splitStage]}>
      {remoteVideoTrack && !audioOnly ? (
        <VideoTrack trackRef={remoteVideoTrack} style={styles.remoteVideo} />
      ) : (
        <View style={styles.audioOnlyBox}>
          <Text style={[styles.audioOnlyEmoji, isSplit && { fontSize: 44 }]}>🩺</Text>
          <Text style={[styles.audioOnlyName, isSplit && { fontSize: 17 }]}>
            {otherPartyName || 'Doctor'}
          </Text>
          <Text style={styles.audioOnlyBadge}>
            {presence.status === 'unstable' ? 'Weak Connection' : 'Audio Connected'}
          </Text>
        </View>
      )}

      {localVideoTrack && !audioOnly && (
        <View style={[styles.pipContainer, isSplit && styles.pipSplit]}>
          <VideoTrack trackRef={localVideoTrack} style={styles.pipVideo} />
        </View>
      )}
    </View>
  );
}

function InCallExperience({
  consultationId,
  otherPartyName,
  onLeave,
  reconnectState,
}: {
  consultationId?: string;
  otherPartyName?: string;
  onLeave: () => void;
  reconnectState: ReconnectState | null;
}) {
  const connectionState = useConnectionState();
  const { isAudioOnlyDegraded, tryVideoAgain } = useNetworkAdaptation();
  const [isDoctorDrafting, setIsDoctorDrafting] = useState(false);
  const [hasIssuedPrescription, setHasIssuedPrescription] = useState(false);
  const [splitPrescriptionOpen, setSplitPrescriptionOpen] = useState(false);

  // LiveKit DataChannel: listen for prescription updates from doctor
  useDataChannel('consult-events', (msg) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(text);
      if (data?.type === 'PRESCRIPTION_DRAFTING') {
        setIsDoctorDrafting(true);
      } else if (data?.type === 'PRESCRIPTION_ISSUED') {
        setIsDoctorDrafting(false);
        setHasIssuedPrescription(true);
        setSplitPrescriptionOpen(true);
        try {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore parse errors
    }
  });

  const isReconnecting =
    connectionState === ConnectionState.Reconnecting || (reconnectState?.isReconnecting ?? false);

  const canShowSplit = Boolean(splitPrescriptionOpen && consultationId);

  return (
    <View style={styles.roomRoot}>
      <NetworkBanner
        visible={isAudioOnlyDegraded}
        message="Switched to audio-only due to weak network"
        onTryVideoAgain={tryVideoAgain}
      />

      {isDoctorDrafting && !hasIssuedPrescription && (
        <View style={styles.draftingPill}>
          <Text style={styles.draftingText}>Doctor is preparing your prescription ✍️</Text>
        </View>
      )}

      {hasIssuedPrescription && !splitPrescriptionOpen && consultationId && (
        <Pressable
          style={styles.openSplitPill}
          onPress={() => setSplitPrescriptionOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open prescription viewer">
          <Text style={styles.openSplitText}>📄 View Prescription (Ready)</Text>
        </Pressable>
      )}

      <View style={styles.bodyContainer}>
        <Stage
          otherPartyName={otherPartyName}
          audioOnly={isAudioOnlyDegraded}
          isSplit={canShowSplit}
        />

        {canShowSplit && (
          <View style={styles.splitSheet}>
            <View style={styles.splitHeader}>
              <View>
                <Text style={styles.splitTitle}>Prescription Issued</Text>
                <Text style={styles.splitSub}>Doctor is walking you through your advice</Text>
              </View>
              <Pressable
                style={styles.splitCloseBtn}
                onPress={() => setSplitPrescriptionOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Collapse prescription view">
                <Text style={styles.splitCloseText}>Minimize ✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.splitScroll} contentContainerStyle={styles.splitScrollPad}>
              <PatientPrescription bookingId={consultationId!} />
            </ScrollView>
          </View>
        )}
      </View>

      <RoomControls onLeave={onLeave} audioOnly={isAudioOnlyDegraded} />

      <ReconnectOverlay
        visible={isReconnecting}
        reconnectState={reconnectState}
        onLeave={onLeave}
      />
    </View>
  );
}

export function CallRoomLiveKit(props: Props) {
  const reconnectPolicy = useMemo(() => new ObservableReconnectPolicy(), []);
  const roomOptions = useMemo(() => buildRoomOptions(reconnectPolicy), [reconnectPolicy]);
  const [reconnectState, setReconnectState] = useState<ReconnectState | null>(null);

  useEffect(() => {
    return reconnectPolicy.subscribe((state) => {
      setReconnectState(state);
    });
  }, [reconnectPolicy]);

  const handleDisconnected = (reason?: DisconnectReason) => {
    // End session when intentionally closed or room ended
    if (
      reason === DisconnectReason.CLIENT_INITIATED ||
      reason === DisconnectReason.ROOM_DELETED ||
      reason === DisconnectReason.ROOM_CLOSED ||
      reason === DisconnectReason.PARTICIPANT_REMOVED
    ) {
      props.onLeave();
    }
  };

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={false}
      onRequestClose={props.onLeave}>
      <View style={styles.roomRoot}>
        <LiveKitRoom
          serverUrl={props.url}
          token={props.token}
          connect={true}
          video={true}
          audio={true}
          options={roomOptions}
          connectOptions={CONNECT_OPTIONS}
          onDisconnected={handleDisconnected}>
          <InCallExperience
            consultationId={props.consultationId}
            otherPartyName={props.otherPartyName}
            onLeave={props.onLeave}
            reconnectState={reconnectState}
          />
        </LiveKitRoom>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  roomRoot: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  bodyContainer: {
    flex: 1,
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  splitStage: {
    flex: 0.42,
  },
  remoteVideo: {
    flex: 1,
  },
  audioOnlyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioOnlyEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  audioOnlyName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  audioOnlyBadge: {
    color: Colors.teal,
    backgroundColor: Colors.tealTint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  pipContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 8,
  },
  pipSplit: {
    top: 10,
    right: 10,
    width: 75,
    height: 105,
  },
  pipVideo: {
    flex: 1,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  draftingPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 40,
    backgroundColor: 'rgba(75, 33, 146, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  draftingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  openSplitPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 40,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8,
  },
  openSplitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  splitSheet: {
    flex: 0.58,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  splitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  splitSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  splitCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.muted,
  },
  splitCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.foreground,
  },
  splitScroll: {
    flex: 1,
  },
  splitScrollPad: {
    padding: 16,
    paddingBottom: 32,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  ctrlBtn: {
    width: 54,
    height: 54,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnOff: {
    backgroundColor: Colors.destructive,
  },
  leaveBtn: {
    backgroundColor: Colors.destructive,
    transform: [{ rotate: '135deg' }],
  },
  ctrlText: {
    fontSize: 22,
  },
});
