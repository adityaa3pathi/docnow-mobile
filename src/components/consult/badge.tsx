import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { toneColors, type Tone } from '@/lib/consult/status';

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  text: { fontSize: 12, fontWeight: '700' },
});
