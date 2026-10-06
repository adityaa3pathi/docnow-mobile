import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  title: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  note: { marginTop: 8, textAlign: 'center', color: Colors.mutedForeground },
});
