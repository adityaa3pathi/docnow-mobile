import { AudioSession, VideoTrack, type TrackReference } from '@livekit/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useNavigation } from 'expo-router';
import {
  ConnectionError, ConnectionErrorReason, ConnectionQuality, DisconnectReason, LocalVideoTrack, Room, RoomEvent, Track, type Participant,
} from 'livekit-client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { addTaskRemovedListener, startCallService, stopCallService } from '../../../modules/call-service';
import { Colors, Radius, Type } from '@/constants/theme';
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

// A soft badge instead of a bright dot on black: the same meaning pairs as the rest of the app.
const QUALITY: Partial<Record<ConnectionQuality, { text: string; bg: string; fg: string }>> = {
  [ConnectionQuality.Excellent]: { text: 'Strong', bg: Colors.successSoft, fg: Colors.successInk },
  [ConnectionQuality.Good]: { text: 'Good', bg: Colors.warningSoft, fg: Colors.warningInk },
  [ConnectionQuality.Poor]: { text: 'Weak', bg: Colors.dangerSoft, fg: Colors.dangerInk },
  [ConnectionQuality.Lost]: { text: 'Lost', bg: Colors.dangerSoft, fg: Colors.dangerInk },
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

/**
 * Android 12+ picks the audio route when the session starts, so the headset prompt has to
 * come first. Optional: without it the call just stays on the speaker.
 */
async function askForBluetooth() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return;
  try {
    await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT');
  } catch {
    // A denied or unavailable prompt must not stop the consultation.
  }
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
    // Swiping the app away never unmounts this screen, so the room is left here instead.
    // Best effort: Android may kill the process before the signal reaches the server.
    const swiped = addTaskRemovedListener(() => void room.disconnect().catch(() => {}));

    void (async () => {
      await askForBluetooth();
      if (closed) return;
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
      if (closed) return;
      // Android: keeps the mic alive if the patient switches apps mid-call. A false result
      // means backgrounding will cut the call, which the doctor's side needs to know about.
      const started = await startCallService();
      if (started === false && !closed) report('media_failed', 'call_service_unavailable');
    })();

    return () => {
      closed = true;
      swiped?.remove();
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
            <ActivityIndicator color={Colors.onPrimary} />
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
              <Text style={[styles.pill, { backgroundColor: quality.bg, color: quality.fg }]} accessibilityLabel={`Connection: ${quality.text}`}>
                <Text style={{ color: quality.fg }}>● </Text>{quality.text}
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
  stage: { width: '100%', borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.ink },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  stageText: { ...Type.bodyStrong, color: Colors.onPrimary, textAlign: 'center' },
  initialWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  initialSmall: { width: 36, height: 36, borderRadius: 18 },
  initialText: { ...Type.titleLg, color: Colors.onPrimary },
  initialTextSmall: { ...Type.body },
  tag: { ...Type.caption, position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: 'rgba(31,26,43,0.75)', color: Colors.onPrimary },
  others: { position: 'absolute', left: 10, top: 44, gap: 8 },
  otherTile: { width: 84, aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: Colors.ink },
  preview: { position: 'absolute', right: 10, bottom: 10, width: '30%', aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: Colors.ink },
  topBar: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pill: { ...Type.caption, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: 'rgba(31,26,43,0.75)', color: Colors.onPrimary, fontVariant: ['tabular-nums'] },
  reconnecting: { ...Type.caption, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Colors.warningSoft, color: Colors.warningInk },
  notice: { gap: 8, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.warningSoft, alignItems: 'flex-start' },
  noticeText: { ...Type.small, color: Colors.warningInk },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  control: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  controlOff: { borderColor: Colors.danger, backgroundColor: Colors.dangerSoft },
  controlDanger: { borderColor: Colors.danger, backgroundColor: Colors.danger },
  controlText: { ...Type.bodyStrong, color: Colors.ink },
  controlTextOff: { color: Colors.dangerInk },
  controlTextDanger: { color: Colors.onPrimary },
  off: { opacity: 0.5 },
  error: { alignItems: 'center', gap: 12, padding: 24, borderRadius: Radius.xl, backgroundColor: Colors.dangerSoft },
  errorText: { ...Type.body, color: Colors.dangerInk, textAlign: 'center' },
});
