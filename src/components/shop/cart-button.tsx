import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { badgeLabel, useCartCount } from '@/lib/cart';

/** Header button for the Lab Tests tab: opens the cart and carries its count. */
export function CartButton() {
  const count = useCartCount();
  const badge = badgeLabel(count);
  return (
    <Pressable
      onPress={() => router.push('/shop/cart')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart, empty'}>
      <Text style={styles.label}>Cart</Text>
      {badge ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: Space[2], minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: Space[3], marginRight: Space[1], borderRadius: Radius.md },
  pressed: { backgroundColor: Colors.primarySoft },
  label: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  badgeText: { ...Type.small, fontFamily: Fonts.bold, color: Colors.onPrimary, lineHeight: 18 },
});
