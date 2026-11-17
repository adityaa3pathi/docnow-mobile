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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { type ReconnectState, ObservableReconnectPolicy } from '@/lib/consult/reconnectPolicy';
import { CONNECT_OPTIONS, buildRoomOptions } from '@/lib/consult/roomOptions';
import { useDoctorPresence } from '@/lib/consult/useDoctorPresence';
import { useNetworkAdaptation } from '@/lib/consult/useNetworkAdaptation';
import { partyOf } from '@/lib/consult/family';
import type { ConsultRoomEvent } from '@/lib/consult/types';
import type { RoomTools, WaitingAidContext } from './call-room-view';
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
  renderTools?: (tools: RoomTools) => React.ReactNode;
  toolsLabel?: string;
  renderWaitingAid?: (ctx: WaitingAidContext) => React.ReactNode;
}

export const CONSULT_EVENTS_TOPIC = 'consult-events';

/** The doctor's in-call tools, collapsed to a pill so the video stays visible until needed. */
function ToolsSheet({
  label,
  open,
  onToggle,
  renderTools,
  lowerPill,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  renderTools: (tools: RoomTools) => React.ReactNode;
  /** Sits below the patient's prescription pill instead of on top of it. */
  lowerPill?: boolean;
}) {
  const room = useRoomContext();
  const tools = useMemo<RoomTools>(
    () => ({
      publish: async (event: ConsultRoomEvent) => {
        const payload = new TextEncoder().encode(JSON.stringify(event));
        await room.localParticipant.publishData(payload, { reliable: true, topic: CONSULT_EVENTS_TOPIC });
      },
    }),
    [room],
  );

  if (!open) {
    return (
      <Pressable style={[styles.openSplitPill, lowerPill && styles.lowerPill]} onPress={onToggle} accessibilityRole="button" accessibilityLabel={`Open ${label}`}>
        <Text style={styles.openSplitText}>📝 {label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.splitSheet}>
      <View style={styles.splitHeader}>
        <View>
          <Text style={styles.splitTitle}>{label}</Text>
          <Text style={styles.splitSub}>The patient can still see and hear you</Text>
        </View>
        <Pressable style={styles.splitCloseBtn} onPress={onToggle} accessibilityRole="button" accessibilityLabel={`Minimize ${label}`}>
          <Text style={styles.splitCloseText}>Minimize ✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.splitScroll} contentContainerStyle={styles.splitScrollPad} keyboardShouldPersistTaps="handled">
        {renderTools(tools)}
      </ScrollView>
    </View>
  );
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
  isDoctor,
}: {
  otherPartyName?: string;
  audioOnly: boolean;
  isSplit?: boolean;
  isDoctor: boolean;
}) {
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const presence = useDoctorPresence(otherPartyName, isDoctor ? 'doctor' : 'patient');
  const primary = presence.doctor;
  // Three-way calls: everyone else (the caregiver, or the patient for the caregiver) as small tiles.
  const others = remoteParticipants.filter((p) => p !== primary);

  const trackOf = (identity: string) =>
    tracks.find((t) => !t.participant.isLocal && t.participant.identity === identity && t.publication.isSubscribed && t.publication.track);
  const remoteVideoTrack = primary ? trackOf(primary.identity) : undefined;
  const localVideoTrack = tracks.find((t) => t.participant.isLocal && t.publication.track);
  const roster = others.map((p) => p.name || (partyOf(p.identity) === 'caretaker' ? 'Family member' : 'Patient'));

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
        <Text style={styles.statusEmoji}>{isDoctor ? '🧑' : '👨‍⚕️'}</Text>
        <Text style={styles.statusText}>
          Waiting for {otherPartyName || (isDoctor ? 'the patient' : 'the doctor')} to join...
        </Text>
        <Text style={styles.statusSub}>You will see and hear them as soon as they enter.</Text>
        {roster.length ? <Text style={styles.rosterLine} testID="call-roster">Already here: {roster.join(', ')}</Text> : null}
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
          <Text style={[styles.audioOnlyEmoji, isSplit && { fontSize: 44 }]}>{isDoctor ? '🧑' : '🩺'}</Text>
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

      {others.length > 0 && (
        <View style={styles.othersColumn} testID="call-others">
          {others.map((p) => {
            const t = audioOnly ? undefined : trackOf(p.identity);
            const name = p.name || (partyOf(p.identity) === 'caretaker' ? 'Family member' : 'Patient');
            return (
              <View key={p.identity} style={styles.otherTile}>
                {t ? <VideoTrack trackRef={t} style={styles.pipVideo} /> : <Text style={styles.otherInitial}>{name.slice(0, 1).toUpperCase()}</Text>}
                <Text style={styles.otherName} numberOfLines={1}>{name}</Text>
              </View>
            );
          })}
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
  isDoctor,
  renderTools,
  toolsLabel,
  renderWaitingAid,
}: {
  consultationId?: string;
  otherPartyName?: string;
  onLeave: () => void;
  reconnectState: ReconnectState | null;
  isDoctor: boolean;
  renderTools?: (tools: RoomTools) => React.ReactNode;
  toolsLabel: string;
  renderWaitingAid?: (ctx: WaitingAidContext) => React.ReactNode;
}) {
  const connectionState = useConnectionState();
  const presence = useDoctorPresence(otherPartyName, isDoctor ? 'doctor' : 'patient');
  const { isAudioOnlyDegraded, tryVideoAgain } = useNetworkAdaptation();
  const [isDoctorDrafting, setIsDoctorDrafting] = useState(false);
  const [hasIssuedPrescription, setHasIssuedPrescription] = useState(false);
  const [splitPrescriptionOpen, setSplitPrescriptionOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  // The server and the doctor's app both announce an issued prescription; react once.
  const issuedSeen = useRef(false);

  // LiveKit DataChannel: listen for prescription updates from doctor. The doctor's own app
  // receives the server's broadcast too, but the patient prescription view is not theirs to open.
  useDataChannel(CONSULT_EVENTS_TOPIC, (msg) => {
    if (isDoctor) return;
    try {
      const text = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(text);
      if (data?.type === 'PRESCRIPTION_DRAFTING') {
        if (!issuedSeen.current) setIsDoctorDrafting(true);
      } else if (data?.type === 'PRESCRIPTION_ISSUED') {
        if (issuedSeen.current) return;
        issuedSeen.current = true;
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
  // The patient's own notes share the sheet slot with the prescription, so only one is open at a time.
  const showTools = !!renderTools && (isDoctor || !canShowSplit);
  const waitingAid = !isDoctor && renderWaitingAid ? renderWaitingAid({ doctorPresent: presence.status !== 'waiting' }) : null;

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
          isSplit={canShowSplit || (showTools && toolsOpen)}
          isDoctor={isDoctor}
        />

        {showTools && renderTools ? (
          <ToolsSheet label={toolsLabel} open={toolsOpen} onToggle={() => setToolsOpen((o) => !o)} renderTools={renderTools} lowerPill={!isDoctor} />
        ) : null}

        {waitingAid ? (
          <ScrollView style={styles.waitingAid} contentContainerStyle={styles.waitingAidPad} pointerEvents="box-none">
            {waitingAid}
          </ScrollView>
        ) : null}

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
            isDoctor={props.role.startsWith('doctor')}
            renderTools={props.renderTools}
            toolsLabel={props.toolsLabel ?? 'Prescription pad'}
            renderWaitingAid={props.renderWaitingAid}
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
  othersColumn: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 8,
  },
  otherTile: {
    width: 84,
    height: 112,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  otherName: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  rosterLine: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
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
  lowerPill: {
    top: 104,
  },
  waitingAid: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: '72%',
    zIndex: 30,
  },
  waitingAidPad: {
    flexGrow: 1,
    justifyContent: 'flex-end',
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
