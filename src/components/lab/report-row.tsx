import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { labReports, reportViewUrl } from '@/lib/lab/api';
import { formatFileSize, formatIstDate } from '@/lib/lab/bookings';
import { openSignedDocument } from '@/lib/lab/open';
import type { LabReportSummary } from '@/lib/lab/types';

export function ReportRow({ report, index }: { report: LabReportSummary; index: number }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stored = report.fetchStatus === 'STORED';
    const failed = report.fetchStatus === 'FAILED';
    const title = report.isFullReport ? 'Full report' : `Partial report ${index + 1}`;
    const when = report.verifiedAt
        ? `Verified ${formatIstDate(report.verifiedAt)}`
        : `Generated ${formatIstDate(report.generatedAt)}`;
    const size = formatFileSize(report.fileSize);

    async function open() {
        setBusy(true);
        setError(null);
        try {
            // The server mints a short-lived token and streams the PDF, so no storage link is shared.
            const detail = await labReports.detail(report.id);
            await openSignedDocument(reportViewUrl(detail.viewToken));
        } catch (e) {
            setError(friendlyError(e, 'We could not open this report right now. Please try again shortly.'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={styles.row}>
            <View style={styles.text}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.muted}>{size ? `${when} · ${size}` : when}</Text>
                {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            </View>
            {stored || failed ? (
                <Pressable
                    style={[styles.button, busy && styles.off]}
                    disabled={busy}
                    onPress={open}
                    accessibilityRole="button"
                    accessibilityLabel={`${failed ? 'Try again to view' : 'View'} ${title}, ${when}`}
                    accessibilityState={{ disabled: busy, busy }}>
                    {busy ? <ActivityIndicator color={Colors.onPrimary} /> : null}
                    <Text style={styles.buttonText}>{busy ? 'Opening...' : failed ? 'Try again' : 'View report'}</Text>
                </Pressable>
            ) : (
                <Badge tone="warning">Being prepared</Badge>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingVertical: Space[2] },
    text: { flex: 1, gap: 2 },
    title: { ...Type.bodyStrong, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted },
    error: { ...Type.small, color: Colors.dangerInk },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space[2], minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
    buttonText: { ...Type.bodyStrong, color: Colors.onPrimary },
    off: { opacity: 0.5 },
});
