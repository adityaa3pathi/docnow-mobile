import { StyleSheet, Text, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';
import { toneColors, type Tone } from '@/lib/consult/status';

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[Type.caption, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
});
