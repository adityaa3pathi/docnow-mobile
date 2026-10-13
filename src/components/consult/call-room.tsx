import { AudioSession, VideoTrack, type TrackReference } from '@livekit/react-native';
import { DisconnectReason, Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { callStage, isAudioRole } from '@/lib/consult/roomText';

interface Props {
  /** LiveKit server URL and access token from the join call. The token carries the display name. */
  url: string;
  token: string;
  role: string;
  otherParty: 'doctor' | 'patient';
  onLeave: () => void;
}

const JOIN_FAILED = 'We could not connect the call. Check your internet and allow camera and microphone, then try again.';
const DROPPED = 'The call was disconnected. Go back and join again.';
const MEDIA_FAILED = 'We could not start your camera or microphone. Allow them for DocNow in your phone settings, then use the buttons below.';

// Every event that changes what the screen shows; each one just triggers a re-render.
const REDRAW = [
  RoomEvent.ConnectionStateChanged, RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished,
] as const;

function cameraRef(p: Participant | undefined): TrackReference | undefined {
  const pub = p?.getTrackPublication(Track.Source.Camera);
  return p && pub?.track && !pub.isMuted ? { participant: p, publication: pub, source: Track.Source.Camera } : undefined;
}

function Initial({ label }: { label: string }) {
  return (
    <View style={styles.initialWrap}>
      <View style={styles.initial}><Text style={styles.initialText}>{label.trim().charAt(0).toUpperCase() || '?'}</Text></View>
    </View>
  );
}

function Control({ label, onPress, disabled, danger, pressed }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; pressed?: boolean }) {
  return (
    <Pressable
      style={[styles.control, danger && styles.controlDanger, disabled && styles.off]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: pressed }}>
      <Text style={[styles.controlText, danger && styles.controlTextDanger]}>{label}</Text>
    </Pressable>
  );
}

/** Our call screen on a plain LiveKit Room. Leaves the room and stops the phone's call audio on unmount. */
export function CallRoom({ url, token, role, otherParty, onLeave }: Props) {
  // Render reads the mutable Room on each redraw; compiler caching keyed on `room` would show stale state.
  'use no memo';
  const [room] = useState(() => new Room({ adaptiveStream: { pixelDensity: 'screen' }, dynacast: true }));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const leaveRef = useRef(onLeave);
  const videoAllowed = !isAudioRole(role);

  useEffect(() => {
    leaveRef.current = onLeave;
  });

  useEffect(() => {
    let closed = false;
    const onDisconnected = (reason?: DisconnectReason) => {
      if (closed || reason === DisconnectReason.CLIENT_INITIATED) return;
      // The server deletes the room when the doctor ends the consultation.
      if (reason === DisconnectReason.ROOM_DELETED) leaveRef.current();
      else setError(DROPPED);
    };
    for (const ev of REDRAW) room.on(ev, redraw);
    room.on(RoomEvent.Disconnected, onDisconnected);

    void (async () => {
      try {
        await AudioSession.startAudioSession();
        if (closed) return;
        await room.connect(url, token);
      } catch {
        if (!closed) setError(JOIN_FAILED);
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        if (videoAllowed) await room.localParticipant.setCameraEnabled(true);
      } catch {
        if (!closed) setNotice(MEDIA_FAILED);
      }
    })();

    return () => {
      closed = true;
      for (const ev of REDRAW) room.off(ev, redraw);
      room.off(RoomEvent.Disconnected, onDisconnected);
      void room.disconnect().finally(() => void AudioSession.stopAudioSession());
    };
  }, [room, url, token, videoAllowed]);

  async function leave() {
    setLeaving(true);
    try {
      await room.disconnect();
    } finally {
      onLeave();
    }
  }

  async function toggle(kind: 'mic' | 'camera', on: boolean) {
    try {
      if (kind === 'mic') await room.localParticipant.setMicrophoneEnabled(on);
      else await room.localParticipant.setCameraEnabled(on);
      setNotice(null);
    } catch {
      setNotice(`We could not turn the ${kind === 'mic' ? 'microphone' : 'camera'} ${on ? 'on' : 'off'}. Check the permission in your phone settings.`);
    }
    redraw();
  }

  if (error) {
    return (
      <View style={styles.error} accessibilityRole="alert">
        <Text style={styles.errorText}>{error}</Text>
        <Control label="Back" onPress={onLeave} />
      </View>
    );
  }

  const remote = [...room.remoteParticipants.values()][0];
  const { stage, reconnecting } = callStage(room.state, !!remote);
  const local = room.localParticipant;
  const remoteCam = cameraRef(remote);
  const localCam = videoAllowed ? cameraRef(local) : undefined;
  const micOn = local.isMicrophoneEnabled;
  const camOn = local.isCameraEnabled;
  const connected = stage !== 'connecting';
  const remoteLabel = remote?.name || `The ${otherParty}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        {stage === 'connecting' ? (
          <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Connecting">
            <ActivityIndicator color="#fff" />
            <Text style={styles.stageText}>Connecting...</Text>
          </View>
        ) : stage === 'waiting' ? (
          <View style={styles.center} accessibilityLiveRegion="polite">
            <Text style={styles.stageText}>Waiting for the {otherParty} to join...</Text>
          </View>
        ) : remoteCam ? (
          <VideoTrack trackRef={remoteCam} style={styles.fill} objectFit="cover" zOrder={0} />
        ) : (
          <Initial label={remoteLabel} />
        )}
        {stage === 'live' ? <Text style={styles.tag} accessibilityLiveRegion="polite">{remoteLabel}</Text> : null}
        {connected && localCam ? (
          <View style={styles.preview} accessibilityLabel="Your camera">
            <VideoTrack trackRef={localCam} style={styles.fill} objectFit="cover" mirror zOrder={1} />
          </View>
        ) : null}
        {reconnecting ? <Text style={styles.reconnecting} accessibilityLiveRegion="polite">Reconnecting...</Text> : null}
      </View>
      {notice ? <Text style={styles.notice} accessibilityRole="alert">{notice}</Text> : null}
      <View style={styles.controls}>
        <Control label={micOn ? 'Mute' : 'Unmute'} pressed={!micOn} disabled={!connected} onPress={() => void toggle('mic', !micOn)} />
        {videoAllowed ? (
          <Control label={camOn ? 'Camera off' : 'Camera on'} pressed={!camOn} disabled={!connected} onPress={() => void toggle('camera', !camOn)} />
        ) : null}
        {videoAllowed && camOn ? <Control label="Switch to audio" disabled={!connected} onPress={() => void toggle('camera', false)} /> : null}
        <Control label="Leave" danger disabled={leaving} onPress={() => void leave()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  stage: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: '#111827' },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  stageText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  initialWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  initialText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  tag: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: '600' },
  preview: { position: 'absolute', right: 10, bottom: 10, width: '30%', aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: '#1f2937' },
  reconnecting: { position: 'absolute', top: 10, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: '700' },
  notice: { padding: 12, borderRadius: Radius.lg, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  control: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.background },
  controlDanger: { borderColor: Colors.destructive, backgroundColor: Colors.destructive },
  controlText: { color: Colors.primary, fontWeight: '700' },
  controlTextDanger: { color: Colors.primaryForeground },
  off: { opacity: 0.5 },
  error: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.xl, backgroundColor: '#fef2f2' },
  errorText: { color: Colors.destructive, fontWeight: '600', textAlign: 'center' },
});
