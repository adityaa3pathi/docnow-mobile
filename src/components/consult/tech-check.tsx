import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Mic, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';
import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';

type MicState = 'unknown' | 'needs-permission' | 'denied' | 'testing' | 'ready' | 'quiet' | 'error';
type CamState = 'unknown' | 'needs-permission' | 'denied' | 'checking' | 'ready' | 'error';

/** Speech at a normal distance is well above this; silence or a covered mic stays below it. */
const HEARD_DB = -45;
const MIC_TEST_MS = 3_000;
const PREVIEW_AFTER_READY_MS = 6_000;

/** -160…0 dBFS to a 0…1 bar. */
const levelFromDb = (db: number) => Math.min(1, Math.max(0, (db + 60) / 60));
const WAVE_BARS = 24;
const silentWave = () => Array<number>(WAVE_BARS).fill(0);

/** The last few seconds of real mic levels, newest on the right, mirrored around the centre line. */
function Waveform({ levels }: { levels: number[] }) {
  return (
    <View style={styles.wave} accessibilityLabel="Microphone level">
      {levels.map((l, i) => (
        <View key={i} style={[styles.waveBar, { height: 4 + Math.round(l * 32), opacity: 0.35 + l * 0.65 }]} />
      ))}
    </View>
  );
}

function DeviceCard({ Icon, title, ok, children, action }: { Icon: LucideIcon; title: string; ok: boolean | null; children: ReactNode; action: ReactNode }) {
  const tone = ok === true ? Colors.success : ok === false ? Colors.warning : Colors.primary;
  const tint = ok === true ? Colors.successTint : ok === false ? Colors.warningTint : Colors.primaryTint;
  return (
    <View style={[styles.device, ok === true && styles.deviceOk]}>
      <View style={styles.row}>
        <View style={[styles.deviceIcon, { backgroundColor: tint }]}>
          <Icon size={22} color={tone} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>{title}</Text>
          {children}
        </View>
        {action}
      </View>
    </View>
  );
}

function Status({ ok, label, testID }: { ok: boolean | null; label: string; testID: string }) {
  return (
    <View style={[styles.status, ok === true ? styles.statusOk : ok === false ? styles.statusBad : styles.statusIdle]} testID={testID}>
      <Text style={[styles.statusText, ok === true ? styles.textOk : ok === false ? styles.textBad : styles.textIdle]}>{label}</Text>
    </View>
  );
}

/**
 * Camera and microphone check before the call. It asks for permission only when the person taps,
 * shows a short self-view for the camera, and listens for 3 seconds to prove the mic picks them up.
 * `paused` stops the preview so it never fights the call for the camera.
 */
export function TechCheck({ paused = false }: { paused?: boolean }) {
  const [camPerm, requestCam] = useCameraPermissions();
  const [cam, setCam] = useState<CamState>('unknown');
  const [preview, setPreview] = useState(false);
  const [mic, setMic] = useState<MicState>('unknown');
  const [levels, setLevels] = useState(silentWave);
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    getRecordingPermissionsAsync()
      .then((p) => {
        if (!cancelled) setMic(p.granted ? 'unknown' : p.canAskAgain ? 'needs-permission' : 'denied');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, []);

  // The self-view switches itself off a few seconds after it worked.
  useEffect(() => {
    if (cam !== 'ready' || !preview) return;
    const t = setTimeout(() => setPreview(false), PREVIEW_AFTER_READY_MS);
    return () => clearTimeout(t);
  }, [cam, preview]);

  const camGranted = camPerm?.granted ?? false;
  const camShown: CamState = cam !== 'unknown' ? cam : camPerm && !camGranted ? (camPerm.canAskAgain ? 'needs-permission' : 'denied') : 'unknown';

  async function checkCamera() {
    if (camShown === 'denied') {
      void Linking.openSettings();
      return;
    }
    if (!camGranted) {
      const res = await requestCam();
      if (!res.granted) {
        setCam(res.canAskAgain ? 'needs-permission' : 'denied');
        return;
      }
    }
    setCam('checking');
    setPreview(true);
  }

  async function testMic() {
    if (mic === 'denied') {
      void Linking.openSettings();
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMic(perm.canAskAgain ? 'needs-permission' : 'denied');
      return;
    }
    setMic('testing');
    setLevels(silentWave());
    let peak = -160;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      const poll = setInterval(() => {
        const m = recorder.getStatus().metering;
        if (typeof m === 'number') {
          peak = Math.max(peak, m);
          if (alive.current) setLevels((prev) => [...prev.slice(1), levelFromDb(m)]);
        }
      }, 100);
      await new Promise((r) => setTimeout(r, MIC_TEST_MS));
      clearInterval(poll);
      await recorder.stop();
      if (!alive.current) return;
      const heard = peak >= HEARD_DB;
      setMic(heard ? 'ready' : 'quiet');
      hapticNotify(heard ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning);
    } catch {
      if (alive.current) setMic('error');
    } finally {
      // The call sets up its own audio session; leave recording off until then.
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      if (alive.current) setLevels(silentWave());
    }
  }

  const camLabel = {
    unknown: 'Camera not checked',
    'needs-permission': 'Camera permission needed',
    denied: 'Camera blocked in Settings',
    checking: 'Checking camera…',
    ready: '✓ Camera Ready',
    error: 'Camera did not start',
  }[camShown];
  const micLabel = {
    unknown: 'Microphone not tested',
    'needs-permission': 'Microphone permission needed',
    denied: 'Microphone blocked in Settings',
    testing: 'Listening… say something',
    ready: '✓ Microphone Ready',
    quiet: 'We could not hear you',
    error: 'Microphone did not start',
  }[mic];

  const camOk = camShown === 'ready' ? true : camShown === 'denied' || camShown === 'error' ? false : null;
  const micOk = mic === 'ready' ? true : mic === 'denied' || mic === 'error' || mic === 'quiet' ? false : null;

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title} accessibilityRole="header">Camera & microphone check</Text>
        <Text style={styles.subtitle}>A quick test so your doctor can see and hear you clearly.</Text>
      </View>

      <DeviceCard
        Icon={Camera}
        title="Camera"
        ok={camOk}
        action={
          <Pressable
            style={[styles.btn, camShown === 'checking' && styles.dim]}
            disabled={camShown === 'checking'}
            onPress={() => void checkCamera()}
            accessibilityRole="button"
            accessibilityLabel={camShown === 'denied' ? 'Open settings to allow the camera' : 'Check camera'}>
            <Text style={styles.btnText}>{camShown === 'denied' ? 'Settings' : camShown === 'ready' ? 'Check again' : 'Check'}</Text>
          </Pressable>
        }>
        <Status ok={camOk} label={camLabel} testID="tech-camera-status" />
      </DeviceCard>
      {preview && !paused ? (
        <View style={styles.preview}>
          <CameraView
            style={styles.previewVideo}
            facing="front"
            onCameraReady={() => {
              setCam('ready');
              hapticNotify(NotificationFeedbackType.Success);
            }}
            onMountError={() => {
              setCam('error');
              setPreview(false);
            }}
          />
          <Text style={styles.previewHint}>This is how your doctor will see you</Text>
        </View>
      ) : null}

      <DeviceCard
        Icon={Mic}
        title="Microphone"
        ok={micOk}
        action={
          <Pressable
            style={[styles.btn, mic === 'testing' && styles.dim]}
            disabled={mic === 'testing'}
            onPress={() => void testMic()}
            accessibilityRole="button"
            accessibilityLabel={mic === 'denied' ? 'Open settings to allow the microphone' : 'Test microphone'}>
            {mic === 'testing' ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.btnText}>{mic === 'denied' ? 'Settings' : 'Test'}</Text>}
          </Pressable>
        }>
        <Status ok={micOk} label={micLabel} testID="tech-mic-status" />
      </DeviceCard>
      {mic === 'testing' ? <Waveform levels={levels} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: Type.title, fontWeight: '800', color: Colors.foreground },
  subtitle: { fontSize: Type.caption, color: Colors.mutedForeground, marginTop: 2 },
  device: { padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  deviceOk: { borderColor: Colors.successTint, backgroundColor: '#F0FDF4' },
  deviceIcon: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 6 },
  label: { fontSize: Type.body, fontWeight: '800', color: Colors.foreground },
  status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusOk: { backgroundColor: Colors.successTint },
  statusBad: { backgroundColor: Colors.warningTint },
  statusIdle: { backgroundColor: Colors.cardMuted },
  statusText: { fontSize: Type.caption, fontWeight: '700' },
  textOk: { color: Colors.success },
  textBad: { color: Colors.warning },
  textIdle: { color: Colors.mutedForeground },
  btn: { minWidth: 84, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.card },
  btnText: { color: Colors.primary, fontWeight: '800' },
  dim: { opacity: 0.6 },
  preview: { gap: 6, alignItems: 'center' },
  previewVideo: { width: 160, height: 200, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#0F172A' },
  previewHint: { fontSize: Type.caption, color: Colors.mutedForeground },
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 44, borderRadius: Radius.lg, backgroundColor: Colors.primaryTint },
  waveBar: { width: 4, borderRadius: Radius.full, backgroundColor: Colors.primary },
});
