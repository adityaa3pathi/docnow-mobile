import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { consult, friendlyError } from '@/lib/consult/api';
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENTS, type IntakeDocument } from '@/lib/consult/family';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';

type Update = (fn: (docs: IntakeDocument[]) => IntakeDocument[]) => void;

const PICK_OPTIONS = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7, exif: false };

/**
 * Photos of outside records (old prescriptions, discharge summaries, other labs' reports), from the
 * camera or the gallery. Each shows at once from the phone's copy and uploads in the background;
 * the booking only waits for uploads that are still running.
 */
export function IntakeDocuments({ documents, onUpdate }: { documents: IntakeDocument[]; onUpdate: Update }) {
  const [notice, setNotice] = useState<{ text: string; settings: boolean } | null>(null);
  const used = documents.filter((d) => d.status !== 'failed').length;
  const remaining = MAX_DOCUMENTS - used;

  function patch(key: string, change: Partial<IntakeDocument>) {
    onUpdate((list) => list.map((d) => (d.key === key ? { ...d, ...change } : d)));
  }

  async function upload(doc: IntakeDocument) {
    try {
      const saved = await consult.uploadAttachment({ uri: doc.previewUri, name: doc.name, mimeType: doc.mimeType });
      patch(doc.key, { status: 'ready', id: saved.id, error: undefined });
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      patch(doc.key, { status: 'failed', error: friendlyError(e, 'Upload failed') });
    }
  }

  async function pick(source: 'camera' | 'library') {
    hapticImpact(ImpactFeedbackStyle.Light);
    setNotice(null);
    if (remaining <= 0) {
      setNotice({ text: `You can attach up to ${MAX_DOCUMENTS} documents.`, settings: false });
      return;
    }
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      const what = source === 'camera' ? 'camera' : 'photos';
      setNotice(
        perm.canAskAgain
          ? { text: `Allow access to your ${what} to attach records.`, settings: false }
          : { text: `DocNow cannot use your ${what}. Turn it on in Settings.`, settings: true },
      );
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync({ ...PICK_OPTIONS, allowsMultipleSelection: true, selectionLimit: remaining });
    if (result.canceled) return;

    const picked = result.assets.slice(0, remaining).map((a, i): IntakeDocument => {
      const tooBig = (a.fileSize ?? 0) > MAX_DOCUMENT_BYTES;
      return {
        key: a.assetId ?? a.uri,
        previewUri: a.uri,
        name: a.fileName || `medical-record-${used + i + 1}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
        status: tooBig ? 'failed' : 'uploading',
        error: tooBig ? 'Too large (max 10 MB)' : undefined,
      };
    });
    // The same photo picked twice is attached once.
    const fresh = picked.filter((p) => !documents.some((d) => d.key === p.key));
    onUpdate((list) => [...list, ...fresh]);
    await Promise.all(fresh.filter((d) => d.status === 'uploading').map(upload));
  }

  function retry(doc: IntakeDocument) {
    patch(doc.key, { status: 'uploading', error: undefined });
    void upload(doc);
  }

  function remove(doc: IntakeDocument) {
    hapticImpact(ImpactFeedbackStyle.Light);
    onUpdate((list) => list.filter((d) => d.key !== doc.key));
    // Best effort: an unclaimed upload left behind is never shown to anyone.
    if (doc.id) consult.removeAttachment(doc.id).catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable testID="intake-take-photo" style={styles.action} onPress={() => void pick('camera')} accessibilityRole="button">
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionText}>Take Photo</Text>
        </Pressable>
        <Pressable testID="intake-pick-gallery" style={styles.action} onPress={() => void pick('library')} accessibilityRole="button">
          <Text style={styles.actionIcon}>🖼️</Text>
          <Text style={styles.actionText}>Upload from Gallery</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Old prescriptions, discharge summaries or reports from other labs. Up to {MAX_DOCUMENTS}, 10 MB each.</Text>

      {notice ? (
        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{notice.text}</Text>
          {notice.settings ? (
            <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button">
              <Text style={styles.link}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {documents.length ? (
        <View style={styles.thumbs}>
          {documents.map((d) => (
            <View key={d.key} testID={`intake-doc-${d.key}`} style={[styles.thumb, d.status === 'failed' && styles.thumbFailed]} accessibilityLabel={`${d.name}, ${d.status}`}>
              <Image source={{ uri: d.previewUri }} style={styles.thumbImage} contentFit="cover" />
              {d.status === 'uploading' ? (
                <View style={styles.overlay}>
                  <ActivityIndicator color={Colors.primaryForeground} />
                </View>
              ) : null}
              {d.status === 'failed' ? (
                <Pressable style={styles.overlay} onPress={() => retry(d)} disabled={d.error === 'Too large (max 10 MB)'} accessibilityRole="button" accessibilityLabel={`Retry ${d.name}`}>
                  <Text style={styles.failedText}>{d.error === 'Too large (max 10 MB)' ? 'Too large' : 'Retry ↻'}</Text>
                </Pressable>
              ) : null}
              <Pressable testID={`intake-doc-remove-${d.key}`} style={styles.remove} onPress={() => remove(d)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${d.name}`}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.card },
  actionIcon: { fontSize: 18 },
  actionText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  hint: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17 },
  notice: { gap: 4, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.warningTint },
  noticeText: { fontSize: 13, color: '#92400e', fontWeight: '600' },
  link: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cardMuted },
  thumbFailed: { borderColor: Colors.destructive },
  thumbImage: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  failedText: { color: Colors.primaryForeground, fontSize: 12, fontWeight: '800' },
  remove: { position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.75)' },
  removeText: { color: Colors.primaryForeground, fontSize: 12, fontWeight: '800' },
});
