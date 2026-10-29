import { router } from 'expo-router';
import { Check, Clock, Droplet, FlaskConical, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadow, Type } from '@/constants/theme';
import { formatRupees } from '@/lib/consult/format';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { useCart } from '@/lib/tests/cart-context';
import { packageFacts } from '@/lib/tests/package';
import type { CatalogItem } from '@/lib/tests/types';

/** Featured health package for the Home carousel; "+ Add" goes straight into the shared cart. */
export function PackageCard({ item }: { item: CatalogItem }) {
  const { addToCart, getItemCount } = useCart();
  const [adding, setAdding] = useState(false);
  const facts = packageFacts(item);
  const inCart = getItemCount(item.partnerCode) > 0;

  async function add() {
    hapticImpact(ImpactFeedbackStyle.Medium);
    setAdding(true);
    try {
      const ok = await addToCart(item.partnerCode);
      hapticNotify(ok ? NotificationFeedbackType.Success : NotificationFeedbackType.Error);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Pressable
      testID={`package-${item.partnerCode}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/tests/[code]', params: { code: item.partnerCode } })}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatRupees(facts.price)}${facts.offPercent ? `, ${facts.offPercent}% off` : ''}`}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <FlaskConical size={20} color={Colors.teal} strokeWidth={2.2} />
        </View>
        {facts.offPercent ? (
          <View style={styles.off}>
            <Text style={styles.offText}>{facts.offPercent}% OFF</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      {facts.parametersCount ? <Text style={styles.params}>{facts.parametersCount} parameters</Text> : null}

      <View style={styles.meta}>
        {facts.fasting ? (
          <View style={[styles.tag, facts.fasting === 'required' ? styles.tagWarn : styles.tagOk]}>
            <Droplet size={11} color={facts.fasting === 'required' ? Colors.warning : Colors.success} strokeWidth={2.4} />
            <Text style={[styles.tagText, { color: facts.fasting === 'required' ? Colors.warning : Colors.success }]}>
              {facts.fasting === 'required' ? 'Fasting required' : 'No fasting'}
            </Text>
          </View>
        ) : null}
        {facts.reportTime ? (
          <View style={[styles.tag, styles.tagMuted]}>
            <Clock size={11} color={Colors.mutedForeground} strokeWidth={2.4} />
            <Text style={[styles.tagText, { color: Colors.mutedForeground }]} numberOfLines={1}>Reports in {facts.reportTime}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text style={styles.price}>{formatRupees(facts.price)}</Text>
          {facts.mrp ? <Text style={styles.mrp}>{formatRupees(facts.mrp)}</Text> : null}
        </View>
        {inCart ? (
          <View style={styles.added} testID={`package-added-${item.partnerCode}`}>
            <Check size={14} color={Colors.success} strokeWidth={3} />
            <Text style={styles.addedText}>Added</Text>
          </View>
        ) : (
          <Pressable
            testID={`package-add-${item.partnerCode}`}
            style={({ pressed }) => [styles.add, (pressed || adding) && styles.addPressed]}
            disabled={adding}
            onPress={() => void add()}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to cart`}
            accessibilityState={{ busy: adding }}>
            {adding ? (
              <ActivityIndicator size="small" color={Colors.primaryForeground} />
            ) : (
              <>
                <Plus size={14} color={Colors.primaryForeground} strokeWidth={3} />
                <Text style={styles.addText}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { width: 232, gap: 8, padding: 14, borderRadius: Radius.xl, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  pressed: { opacity: 0.92 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.tealTint },
  off: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, backgroundColor: Colors.successTint },
  offText: { fontSize: 11, fontWeight: '800', color: Colors.success },
  name: { fontSize: Type.body + 1, fontWeight: '800', color: Colors.foreground, lineHeight: 20, minHeight: 40 },
  params: { fontSize: Type.caption, fontWeight: '700', color: Colors.teal },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full, maxWidth: '100%' },
  tagWarn: { backgroundColor: Colors.warningTint },
  tagOk: { backgroundColor: Colors.successTint },
  tagMuted: { backgroundColor: Colors.cardMuted },
  tagText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  price: { fontSize: Type.title + 1, fontWeight: '800', color: Colors.foreground },
  mrp: { fontSize: Type.caption, color: Colors.mutedForeground, textDecorationLine: 'line-through' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, minWidth: 72, justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.primary },
  addPressed: { backgroundColor: Colors.primaryDark },
  addText: { color: Colors.primaryForeground, fontWeight: '800', fontSize: Type.body - 1 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: Radius.md, backgroundColor: Colors.successTint },
  addedText: { color: Colors.success, fontWeight: '800', fontSize: Type.body - 1 },
});
