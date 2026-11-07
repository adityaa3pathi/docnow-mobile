import { AudioSession, VideoTrack, type TrackReference } from '@livekit/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useNavigation } from 'expo-router';
import {
  ConnectionError, ConnectionErrorReason, ConnectionQuality, DisconnectReason, LocalVideoTrack, Room, RoomEvent, Track, type Participant,
} from 'livekit-client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { startCallService, stopCallService } from '../../../modules/call-service';
import { Colors, Radius } from '@/constants/theme';
import { callEvents, type CallEventName } from '@/lib/consult/api';
import { arrangeTiles, formatDuration, partyOfRole, videoFit } from '@/lib/consult/callLayout';
import { callStage, isAudioRole } from '@/lib/consult/roomText';

interface Props {
  /** LiveKit server URL and access token from the join call. The token carries the display name. */
  url: string;
  token: string;
  role: string;
  otherParty: 'doctor' | 'patient';
  onLeave: () => void;
  /** Asks the join panel for a fresh room after a failure. */
  onRetry: () => void;
}

type ErrorKind = 'network' | 'expired' | 'dropped' | 'unknown';
const ERRORS: Record<ErrorKind, string> = {
  network: 'Your internet connection failed. Check it, then tap Retry.',
  expired: 'This call link has expired. Go back and join again.',
  dropped: 'The call was disconnected. Tap Retry, or go back and join again.',
  unknown: 'We could not connect the call. Check your internet and allow camera and microphone, then try again.',
};

type NoticeKind = 'media' | 'mic' | 'camera' | 'flip';
const NOTICES: Record<NoticeKind, string> = {
  media: 'We could not start your camera or microphone. Allow them for DocNow in your phone settings, then use the buttons below.',
  mic: 'We could not change the microphone. Check the permission in your phone settings.',
  camera: 'We could not change the camera. Check the permission in your phone settings.',
  flip: 'We could not switch the camera.',
};

const QUALITY: Partial<Record<ConnectionQuality, { text: string; color: string }>> = {
  [ConnectionQuality.Excellent]: { text: 'Strong', color: '#4ade80' },
  [ConnectionQuality.Good]: { text: 'Good', color: '#fde047' },
  [ConnectionQuality.Poor]: { text: 'Weak', color: '#f87171' },
  [ConnectionQuality.Lost]: { text: 'Lost', color: '#f87171' },
};

// Every event that changes what the screen shows; each one just triggers a re-render.
const REDRAW = [
  RoomEvent.ConnectionStateChanged, RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ConnectionQualityChanged,
] as const;

/** LiveKit's reason codes; message text changes between versions and may hold personal data. */
function classify(err: unknown): ErrorKind {
  if (!(err instanceof ConnectionError)) return 'unknown';
  if (err.reason === ConnectionErrorReason.NotAllowed) return 'expired';
  if ([ConnectionErrorReason.ServerUnreachable, ConnectionErrorReason.Timeout, ConnectionErrorReason.WebSocket].includes(err.reason)) return 'network';
  return 'unknown';
}

function reasonCode(err: unknown): string {
  if (err instanceof ConnectionError) return `${ConnectionErrorReason[err.reason]}${err.status ? `:${err.status}` : ''}`;
  return err instanceof Error ? err.name : 'unknown';
}

function cameraRef(p: Participant | undefined): TrackReference | undefined {
  const pub = p?.getTrackPublication(Track.Source.Camera);
  return p && pub?.track && !pub.isMuted ? { participant: p, publication: pub, source: Track.Source.Camera } : undefined;
}

function Initial({ label, small }: { label: string; small?: boolean }) {
  return (
    <View style={styles.initialWrap}>
      <View style={[styles.initial, small && styles.initialSmall]}>
        <Text style={[styles.initialText, small && styles.initialTextSmall]}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
      </View>
    </View>
  );
}

function Control({ label, onPress, disabled, danger, pressed }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; pressed?: boolean }) {
  return (
    <Pressable
      style={[styles.control, danger && styles.controlDanger, pressed && styles.controlOff, disabled && styles.off]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: pressed }}>
      <Text style={[styles.controlText, danger && styles.controlTextDanger, pressed && styles.controlTextOff]}>{label}</Text>
    </Pressable>
  );
}

const confirmLeave = (onYes: () => void) =>
  Alert.alert('Leave the call?', 'The consultation call will end for you.', [
    { text: 'Stay', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: onYes },
  ]);

/** Our call screen on a plain LiveKit Room. Leaves the room and stops the phone's call audio on unmount. */
export function CallRoom({ url, token, role, otherParty, onLeave, onRetry }: Props) {
  // Render reads the mutable Room on each redraw; compiler caching keyed on `room` would show stale state.
  'use no memo';
  useKeepAwake(); // a quiet stretch of the consultation must not lock the phone
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const [room] = useState(() => new Room({ adaptiveStream: { pixelDensity: 'screen' }, dynacast: true }));
  const [error, setError] = useState<ErrorKind | null>(null);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [seconds, setSeconds] = useState(0);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const leaveRef = useRef(onLeave);
  const allowExit = useRef(false);
  const startedAt = useRef<number | null>(null);
  const videoAllowed = !isAudioRole(role);

  useEffect(() => {
    leaveRef.current = onLeave;
  });

  useEffect(() => {
    let closed = false;
    const report = (event: CallEventName, reason?: string) => void callEvents.report(token, event, reason).catch(() => {});
    const onDisconnected = (reason?: DisconnectReason) => {
      if (closed || reason === DisconnectReason.CLIENT_INITIATED) return;
      // The server deletes the room when the doctor ends the consultation.
      if (reason === DisconnectReason.ROOM_DELETED) return leaveRef.current();
      setError('dropped');
      report('disconnected', reason === undefined ? undefined : DisconnectReason[reason]);
    };
    const onReconnected = () => report('reconnected');
    for (const ev of REDRAW) room.on(ev, redraw);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Reconnected, onReconnected);

    void (async () => {
      try {
        await AudioSession.startAudioSession();
        if (closed) return;
        await room.connect(url, token);
      } catch (err) {
        if (closed) return;
        setError(classify(err));
        report('connect_failed', reasonCode(err));
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        if (videoAllowed) await room.localParticipant.setCameraEnabled(true, { facingMode: 'user' });
      } catch (err) {
        if (closed) return;
        setNotice('media');
        report('media_failed', reasonCode(err));
      }
      // Android: keeps the mic alive if the patient switches apps mid-call.
      if (!closed) startCallService();
    })();

    return () => {
      closed = true;
      stopCallService();
      for (const ev of REDRAW) room.off(ev, redraw);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnected, onReconnected);
      void room.disconnect().finally(() => void AudioSession.stopAudioSession());
    };
  }, [room, url, token, videoAllowed]);

  // Back gesture or button would drop a paid consultation silently, so it asks first.
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (allowExit.current || error) return;
    e.preventDefault();
    confirmLeave(() => {
      allowExit.current = true;
      navigation.dispatch(e.data.action);
    });
  }), [navigation, error]);

  const remotes = [...room.remoteParticipants.values()];
  const { primary: remote, others } = arrangeTiles(remotes, partyOfRole(role));
  const { stage, reconnecting } = callStage(room.state, !!remote);

  // Counts from when both sides are in, so doctor and patient see the same time.
  const live = stage === 'live';
  useEffect(() => {
    if (!live) return;
    startedAt.current ??= Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(id);
  }, [live]);

  async function leave() {
    setLeaving(true);
    allowExit.current = true;
    try {
      await room.disconnect();
    } finally {
      onLeave();
    }
  }

  async function toggle(kind: 'mic' | 'camera', on: boolean) {
    try {
      if (kind === 'mic') await room.localParticipant.setMicrophoneEnabled(on);
      else await room.localParticipant.setCameraEnabled(on, { facingMode: facing });
      setNotice(null);
    } catch {
      setNotice(kind);
    }
    redraw();
  }

  async function flip() {
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!(track instanceof LocalVideoTrack)) return;
    const next = facing === 'user' ? 'environment' : 'user';
    try {
      await track.restartTrack({ facingMode: next });
      setFacing(next);
      setNotice(null);
    } catch {
      setNotice('flip');
    }
    redraw();
  }

  if (error) {
    return (
      <View style={styles.error} accessibilityRole="alert">
        <Text style={styles.errorText}>{ERRORS[error]}</Text>
        <View style={styles.controls}>
          <Control label="Back" onPress={onLeave} />
          {/* An expired token fails the same way again, so only Back is offered. */}
          {error !== 'expired' ? <Control label="Retry" onPress={onRetry} /> : null}
        </View>
      </View>
    );
  }

  const local = room.localParticipant;
  const remoteCam = cameraRef(remote);
  const stageHeight = Math.round(height * 0.6);
  // The publisher's resolution is known from the room, so a landscape laptop doctor isn't cropped to a sliver.
  const dims = remoteCam?.publication.dimensions;
  const remoteFit = dims ? videoFit(dims.width, dims.height, width, stageHeight) : 'cover';
  const localCam = videoAllowed ? cameraRef(local) : undefined;
  const micOn = local.isMicrophoneEnabled;
  const camOn = local.isCameraEnabled;
  const connected = stage !== 'connecting';
  const labelOf = (p: Participant) => p.name || `The ${otherParty}`;
  const remoteLabel = remote ? labelOf(remote) : '';
  const quality = QUALITY[local.connectionQuality];

  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { height: stageHeight }]}>
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
          <VideoTrack trackRef={remoteCam} style={styles.fill} objectFit={remoteFit} zOrder={0} />
        ) : (
          <Initial label={remoteLabel} />
        )}
        {live && remote ? (
          <Text style={styles.tag} accessibilityLiveRegion="polite">
            {remote.isMicrophoneEnabled ? remoteLabel : `${remoteLabel} · Muted`}
          </Text>
        ) : null}
        {/* Three-way calls: the family member (or patient, for the doctor) as small tiles. */}
        {live && others.length > 0 ? (
          <View style={styles.others}>
            {others.map((p) => {
              const cam = cameraRef(p);
              return (
                <View key={p.identity} style={styles.otherTile} accessibilityLabel={labelOf(p)}>
                  {cam ? <VideoTrack trackRef={cam} style={styles.fill} objectFit="cover" zOrder={1} /> : <Initial label={labelOf(p)} small />}
                </View>
              );
            })}
          </View>
        ) : null}
        {connected && localCam ? (
          <View style={styles.preview} accessibilityLabel="Your camera">
            {/* A back camera shows the world, so mirroring it would flip any text held up. */}
            <VideoTrack trackRef={localCam} style={styles.fill} objectFit="cover" mirror={facing === 'user'} zOrder={1} />
          </View>
        ) : null}
        {connected ? (
          <View style={styles.topBar} pointerEvents="none">
            {live && seconds > 0 ? <Text style={styles.pill}>{formatDuration(seconds)}</Text> : <View />}
            {reconnecting ? <Text style={styles.reconnecting} accessibilityLiveRegion="polite">Reconnecting...</Text> : null}
            {quality ? (
              <Text style={styles.pill} accessibilityLabel={`Connection: ${quality.text}`}>
                <Text style={{ color: quality.color }}>● </Text>{quality.text}
              </Text>
            ) : <View />}
          </View>
        ) : null}
      </View>
      {notice ? (
        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{NOTICES[notice]}</Text>
          {notice !== 'flip' ? <Control label="Open settings" onPress={() => void Linking.openSettings()} /> : null}
        </View>
      ) : null}
      <View style={styles.controls}>
        <Control label={micOn ? 'Mute' : 'Unmute'} pressed={!micOn} disabled={!connected} onPress={() => void toggle('mic', !micOn)} />
        {videoAllowed ? (
          <Control label={camOn ? 'Camera off' : 'Camera on'} pressed={!camOn} disabled={!connected} onPress={() => void toggle('camera', !camOn)} />
        ) : null}
        {videoAllowed && camOn ? <Control label="Flip camera" disabled={!connected} onPress={() => void flip()} /> : null}
        <Control label="Leave" danger disabled={leaving} onPress={() => confirmLeave(() => void leave())} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  stage: { width: '100%', borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: '#111827' },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  stageText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  initialWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  initialSmall: { width: 36, height: 36, borderRadius: 18 },
  initialText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  initialTextSmall: { fontSize: 16 },
  tag: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: '600' },
  others: { position: 'absolute', left: 10, top: 44, gap: 8 },
  otherTile: { width: 84, aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: '#1f2937' },
  preview: { position: 'absolute', right: 10, bottom: 10, width: '30%', aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: '#1f2937' },
  topBar: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reconnecting: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: '700' },
  notice: { gap: 8, padding: 12, borderRadius: Radius.lg, backgroundColor: '#fef3c7', alignItems: 'flex-start' },
  noticeText: { color: '#92400e', fontWeight: '600' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  control: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.background },
  controlOff: { borderColor: '#b91c1c', backgroundColor: '#fee2e2' },
  controlDanger: { borderColor: Colors.destructive, backgroundColor: Colors.destructive },
  controlText: { color: Colors.primary, fontWeight: '700' },
  controlTextOff: { color: '#b91c1c' },
  controlTextDanger: { color: Colors.primaryForeground },
  off: { opacity: 0.5 },
  error: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.xl, backgroundColor: '#fef2f2' },
  errorText: { color: Colors.destructive, fontWeight: '600', textAlign: 'center' },
});
