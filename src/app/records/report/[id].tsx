import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Radius } from '@/constants/theme';
import { errorStatus, friendlyError } from '@/lib/consult/api';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { reportsApi } from '@/lib/tests/api';
import { formatFileSize, reportDateLabel, reportFileName, reportTitle } from '@/lib/tests/reports';

type Busy = 'view' | 'download' | 'share' | null;

/** Target of `docnow://records/report/<reportId>`, e.g. from the "Your Lab Report is Ready" push. */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState<Busy>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // The view token expires, so the details are re-read on every visit rather than cached long.
  const query = useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: () => reportsApi.detail(id),
    enabled: !!id,
    staleTime: 60_000,
    retry: (count, e) => errorStatus(e) !== 404 && count < 2,
  });
  const report = query.data;

  async function run(kind: Exclude<Busy, null>, action: () => Promise<void>, failure: string) {
    hapticImpact(ImpactFeedbackStyle.Light);
    setBusy(kind);
    setActionError(null);
    try {
      await action();
    } catch (e) {
      hapticNotify(NotificationFeedbackType.Error);
      setActionError(friendlyError(e, failure));
    } finally {
      setBusy(null);
    }
  }

  if (query.isLoading) return <LoadingBlock label="Loading your report" />;
  if (!report) {
    const missing = errorStatus(query.error) === 404;
    return (
      <View style={styles.pad}>
        <ErrorState
          message={missing ? 'This report is not available. It may belong to another account.' : friendlyError(query.error, 'We could not load your report.')}
          onRetry={missing ? undefined : () => void query.refetch()}
        />
      </View>
    );
  }

  const url = reportsApi.publicUrl(report.viewToken);
  const title = reportTitle(report.tests);
  const size = formatFileSize(report.fileSize);
  const preparing = report.fetchStatus !== 'STORED';

  const view = () =>
    run('view', async () => {
      await WebBrowser.openBrowserAsync(url, { toolbarColor: Colors.primary, controlsColor: Colors.primaryForeground });
    }, 'We could not open the report.');

  // The system browser saves the PDF to Downloads (Android) or Files (iOS) from its own menu.
  const download = () => run('download', () => Linking.openURL(url), 'We could not start the download.');

  // Shares the PDF itself, not the link, because the link stops working after a few days.
  const share = () =>
    run('share', async () => {
      if (!(await Sharing.isAvailableAsync())) {
        await Share.share({ message: `My DocNow lab report: ${url}` });
        return;
      }
      const file = await File.downloadFileAsync(url, new File(Paths.cache, reportFileName(report)), { idempotent: true });
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share lab report' });
    }, 'We could not prepare the report for sharing.');

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}>
      <Stack.Screen options={{ title: 'Lab Report' }} />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>🧪</Text>
          </View>
          {report.verifiedAt ? (
            <View style={styles.verified} accessibilityLabel="Verified by the lab">
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">{title}</Text>
        <Text style={styles.heroMeta}>
          {[report.patientName, reportDateLabel(report), report.isFullReport ? 'Full report' : 'Partial report'].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {preparing ? (
        <View style={styles.note} accessibilityLiveRegion="polite">
          <Text style={styles.noteText}>We are fetching the PDF from the lab. Opening it may take a few seconds.</Text>
        </View>
      ) : null}

      {report.tests.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tests in this report</Text>
          <View style={styles.pills}>
            {report.tests.map((t) => (
              <View key={t} style={styles.pill}>
                <Text style={styles.pillText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Pressable
          style={[styles.primaryBtn, busy !== null && styles.dim]}
          onPress={view}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="View report PDF">
          {busy === 'view' ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.primaryText}>📄 View PDF</Text>}
        </Pressable>
        <View style={styles.row}>
          <Pressable
            style={[styles.outlineBtn, busy !== null && styles.dim]}
            onPress={download}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Download report PDF">
            {busy === 'download' ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.outlineText}>⬇ Download{size ? ` · ${size}` : ''}</Text>}
          </Pressable>
          <Pressable
            style={[styles.outlineBtn, busy !== null && styles.dim]}
            onPress={share}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Share report">
            {busy === 'share' ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.outlineText}>↗ Share Report</Text>}
          </Pressable>
        </View>
        {actionError ? (
          <Text style={styles.errorText} accessibilityRole="alert">{actionError}</Text>
        ) : null}
      </View>

      <Pressable
        style={styles.consult}
        onPress={() => {
          hapticImpact(ImpactFeedbackStyle.Light);
          router.push('/(tabs)');
        }}
        accessibilityRole="button"
        accessibilityLabel="Consult a doctor about this report">
        <Text style={styles.consultIcon}>🩺</Text>
        <View style={styles.flexText}>
          <Text style={styles.consultTitle}>Consult Doctor on this Report</Text>
          <Text style={styles.consultSub}>Pick a doctor and keep this report open during the video call.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  flexText: { flex: 1 },
  pad: { flex: 1, padding: 16, backgroundColor: Colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hero: { gap: 6, padding: 18, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  heroIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  heroIconText: { fontSize: 22 },
  verified: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.successTint },
  verifiedText: { fontSize: 12, fontWeight: '800', color: Colors.success },
  heroTitle: { fontSize: 20, fontWeight: '800', color: Colors.primaryForeground },
  heroMeta: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' },
  note: { padding: 12, borderRadius: Radius.md, backgroundColor: Colors.warningTint },
  noteText: { fontSize: 13, color: '#92400e', fontWeight: '600' },
  card: { gap: 12, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.primaryTint },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  row: { flexDirection: 'row', gap: 10 },
  primaryBtn: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primary },
  primaryText: { color: Colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  outlineBtn: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary },
  outlineText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  dim: { opacity: 0.6 },
  errorText: { color: Colors.destructive, fontSize: 13, fontWeight: '600' },
  consult: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.xl, backgroundColor: Colors.tealTint },
  consultIcon: { fontSize: 24 },
  consultTitle: { fontSize: 15, fontWeight: '700', color: Colors.teal },
  consultSub: { fontSize: 12, color: Colors.foreground, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.teal, fontWeight: '600' },
});
