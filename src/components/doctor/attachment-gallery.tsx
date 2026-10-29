import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { formatIstDay } from '@/lib/consult/time';
import type { ConsultAttachment } from '@/lib/consult/types';

const isImage = (a: ConsultAttachment) => a.mimeType.startsWith('image/');

/**
 * The booker's uploaded records in the doctor's dossier: thumbnails, then a full-screen viewer so an
 * old prescription can be read while on the call. PDFs open in the in-app browser.
 */
export function AttachmentGallery({ attachments }: { attachments: ConsultAttachment[] }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : attachments[open] ?? null;
  const go = (step: number) => setOpen((i) => (i === null ? i : (i + step + attachments.length) % attachments.length));

  function openAt(i: number) {
    const a = attachments[i];
    if (!a) return;
    if (isImage(a)) setOpen(i);
    else void WebBrowser.openBrowserAsync(a.url);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Attached documents</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {attachments.map((a, i) => (
          <Pressable key={a.id} testID={`dossier-doc-${a.id}`} style={styles.thumb} onPress={() => openAt(i)} accessibilityRole="button" accessibilityLabel={`Open ${a.name}`}>
            {isImage(a) ? (
              <Image source={{ uri: a.url }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>📄</Text>
                <Text style={styles.fileExt}>PDF</Text>
              </View>
            )}
            <Text style={styles.thumbName} numberOfLines={1}>{a.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={current !== null} animationType="fade" onRequestClose={() => setOpen(null)} supportedOrientations={['portrait', 'landscape']}>
        {current ? (
          <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]} testID="dossier-doc-viewer">
            <View style={styles.viewerBar}>
              <View style={styles.flex}>
                <Text style={styles.viewerTitle} numberOfLines={1}>{current.name}</Text>
                <Text style={styles.viewerSub}>
                  Uploaded {formatIstDay(current.uploadedAt)}
                  {attachments.length > 1 ? ` · ${(open ?? 0) + 1} of ${attachments.length}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close document">
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <Image source={{ uri: current.url }} style={styles.full} contentFit="contain" accessibilityLabel={current.name} />
            {attachments.length > 1 ? (
              <View style={styles.nav}>
                <Pressable style={styles.navBtn} onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Previous document">
                  <Text style={styles.navText}>‹ Previous</Text>
                </Pressable>
                <Pressable style={styles.navBtn} onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Next document">
                  <Text style={styles.navText}>Next ›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { gap: 10 },
  thumb: { width: 92, gap: 4 },
  thumbImage: { width: 92, height: 92, borderRadius: Radius.md, backgroundColor: Colors.cardMuted },
  fileIcon: { width: 92, height: 92, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardMuted },
  fileIconText: { fontSize: 28 },
  fileExt: { fontSize: 11, fontWeight: '800', color: Colors.mutedForeground },
  thumbName: { fontSize: 11, color: Colors.foreground },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  viewerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  viewerSub: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
  close: { fontSize: 22, color: '#fff', fontWeight: '700' },
  full: { flex: 1, width: '100%' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  navBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  navText: { color: '#fff', fontWeight: '700' },
});
