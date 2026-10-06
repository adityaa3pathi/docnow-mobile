import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
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
  card: { gap: 12, padding: 16, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.muted, backgroundColor: Colors.background },
  label: { fontSize: 12, color: Colors.mutedForeground },
  strong: { fontWeight: '700', color: Colors.foreground },
  semi: { fontWeight: '600', color: Colors.foreground },
  muted: { color: Colors.mutedForeground },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.muted },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.foreground },
});
