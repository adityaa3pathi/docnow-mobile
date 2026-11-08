import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { formatIstDateTime, formatIstTime } from '@/lib/consult/time';

interface Props {
  doctorName: string;
  specialty: string;
  startsAt: string;
  endsAt: string;
  /** Already formatted, so paise and rupees are never mixed here. */
  amount: string;
  amountLabel?: string;
  personName?: string;
}

export function BookingSummary({ doctorName, specialty, startsAt, endsAt, amount, amountLabel = 'Fee', personName }: Props) {
  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={`Doctor: ${doctorName}, ${specialty}`}>
        <Text style={styles.label}>Doctor</Text>
        <Text style={styles.strong}>{doctorName}</Text>
        <Text style={styles.muted}>{specialty}</Text>
      </View>
      <View accessible accessibilityLabel={`When, Indian time: ${formatIstDateTime(startsAt)} to ${formatIstTime(endsAt)}`}>
        <Text style={styles.label}>When (Indian time)</Text>
        <Text style={styles.semi}>
          {formatIstDateTime(startsAt)} to {formatIstTime(endsAt)}
        </Text>
      </View>
      {personName ? (
        <View accessible accessibilityLabel={`Visit is for ${personName}`}>
          <Text style={styles.label}>Visit is for</Text>
          <Text style={styles.semi}>{personName}</Text>
        </View>
      ) : null}
      <View style={styles.total} accessible accessibilityLabel={`${amountLabel}: ${amount}`}>
        <Text style={styles.semi}>{amountLabel}</Text>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Space[3], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  label: { ...Type.small, color: Colors.inkMuted },
  strong: { ...Type.bodyStrong, color: Colors.ink },
  semi: { ...Type.body, color: Colors.ink, fontVariant: ['tabular-nums'] },
  muted: { ...Type.small, color: Colors.inkMuted },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space[4], paddingTop: Space[3], borderTopWidth: 1, borderTopColor: Colors.border },
  amount: { ...Type.bodyLg, fontFamily: Fonts.medium, flexShrink: 1, textAlign: 'right', color: Colors.ink, fontVariant: ['tabular-nums'] },
});
