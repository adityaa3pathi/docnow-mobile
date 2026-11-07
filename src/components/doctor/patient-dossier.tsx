import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/doctor/ui';
import { Colors, Radius } from '@/constants/theme';
import { API_URL } from '@/lib/api';
import { formatIstDateTime } from '@/lib/consult/time';
import type { DoctorConsultationRecord } from '@/lib/consult/types';

const LANGUAGE: Record<string, string> = { hi: 'Hindi', en: 'English' };

function Chips({ items, warn }: { items: string[]; warn?: boolean }) {
  return (
    <View style={styles.chips}>
      {items.map((i) => (
        <Text key={i} style={[styles.chip, warn && styles.chipWarn]}>{i}</Text>
      ))}
    </View>
  );
}

function Field({ label, items, empty, warn }: { label: string; items: string[]; empty: string; warn?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {items.length ? <Chips items={items} warn={warn} /> : <Text style={styles.muted}>{empty}</Text>}
    </View>
  );
}

function Link({ title, sub, url }: { title: string; sub: string; url: string }) {
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(url)} style={styles.link} accessibilityRole="link" accessibilityLabel={`Open ${title}`}>
      <Text style={styles.linkText} numberOfLines={1}>{title}</Text>
      <Text style={styles.muted}>{sub}</Text>
    </Pressable>
  );
}

/**
 * What the doctor needs before prescribing. The app showed only name, age and gender, so
 * allergies, current medicines and shared reports were invisible on the phone.
 */
export function PatientDossier({ record }: { record: DoctorConsultationRecord }) {
  const p = record.patient;
  return (
    <Card>
      <Text style={styles.title} accessibilityRole="header">Medical history</Text>
      <Field label="Allergies" items={p.allergies ?? []} empty="None recorded. Confirm verbally before prescribing." warn />
      <Field label="Current medicines" items={p.currentMedications ?? []} empty="None recorded" />
      <Field label="Ongoing conditions" items={p.chronicConditions ?? []} empty="None recorded" />
      <Text style={styles.muted}>
        Blood group: {p.bloodGroup || 'Not recorded'} · Speaks: {LANGUAGE[p.preferredLanguage] ?? p.preferredLanguage}
      </Text>

      {record.caregiver ? (
        <Text style={styles.note}>
          Booked by {record.caregiver.name} ({record.caregiver.relation}).{' '}
          {record.caregiver.coJoining ? 'They will join to help.' : 'They are not joining.'}
        </Text>
      ) : null}

      {record.attachedReports?.length || record.attachments?.length ? (
        <View style={styles.field}>
          <Text style={styles.label}>Shared records</Text>
          {record.attachedReports.map((r) => (
            <Link key={r.id} title={r.label} sub={r.date ? formatIstDateTime(r.date) : 'DocNow lab report'}
              url={`${API_URL}/api/reports/public/${encodeURIComponent(r.viewToken)}`} />
          ))}
          {record.attachments.map((a) => (
            <Link key={a.id} title={a.name} sub={`Uploaded ${formatIstDateTime(a.uploadedAt)}`} url={a.url} />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>No reports or photos shared.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', fontSize: 16, color: Colors.foreground },
  field: { gap: 6 },
  label: { fontWeight: '600', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  note: { color: Colors.foreground },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: '#f3f4f6', color: Colors.foreground, overflow: 'hidden' },
  chipWarn: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700' },
  link: { padding: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.muted, gap: 2 },
  linkText: { color: Colors.primary, fontWeight: '600' },
});
