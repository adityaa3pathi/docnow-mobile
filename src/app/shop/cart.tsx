import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { personLabel, useCart, useRemoveCartItem, type CartItem } from '@/lib/cart';
import { friendlyError } from '@/lib/consult/api';
import { formatPrice } from '@/lib/shop/product-text';

/** A list with removal only. Checkout, people and slots come next, on top of this cart module. */
export default function CartScreen() {
  const { cart, count, loading, failed, refresh } = useCart();
  const remove = useRemoveCartItem();

  if (loading) return <LoadingBlock label="Loading cart" />;
  if (failed) {
    return (
      <View style={styles.pad}>
        <ErrorState message="We could not load your cart." onRetry={refresh} />
      </View>
    );
  }

  if (count === 0) {
    return (
      <View style={styles.pad}>
        <EmptyState
          title="Your cart is empty"
          body="Add a test or a package to get started."
          action={
            <Pressable
              onPress={() => router.replace('/tests')}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
              accessibilityLabel="Browse lab tests">
              <Text style={styles.ctaText}>Browse lab tests</Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: CartItem }) => (
          <Row item={item} onRemove={() => remove.mutate(item.id)} removing={remove.isPending && remove.variables === item.id} />
        )}
        ListHeaderComponent={
          <Text style={styles.count}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {remove.isError && (
              <Text style={styles.error} accessibilityRole="alert">
                {friendlyError(remove.error, 'Could not remove that item. Please try again.')}
              </Text>
            )}
            <Text style={styles.note}>The amount to pay is worked out at checkout, which is coming soon.</Text>
          </View>
        }
      />
    </View>
  );
}

function Row({ item, onRemove, removing }: { item: CartItem; onRemove: () => void; removing: boolean }) {
  const unavailable = item.isAvailable === false;
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>{item.testName}</Text>
        <Text style={styles.person}>{personLabel(item)}</Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        {unavailable && (
          <Text style={styles.unavailable}>This test is not available right now. Please remove it.</Text>
        )}
      </View>
      <Pressable
        onPress={onRemove}
        disabled={removing}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed, removing && styles.removeBusy]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.testName} from cart`}
        accessibilityState={{ busy: removing, disabled: removing }}>
        <Text style={styles.removeText}>{removing ? 'Removing' : 'Remove'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  pad: { padding: Space[4] },
  list: { padding: Space[4], gap: Space[3] },
  count: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  rowText: { flex: 1, gap: Space[1] },
  name: { ...Type.bodyStrong, color: Colors.ink },
  person: { ...Type.small, color: Colors.inkMuted },
  price: { ...Type.body, fontFamily: Fonts.semibold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  unavailable: { ...Type.small, color: Colors.dangerInk },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  removePressed: { backgroundColor: Colors.surfaceMuted },
  removeBusy: { opacity: 0.6 },
  removeText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
  cta: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[6], borderRadius: Radius.md, backgroundColor: Colors.primary },
  ctaPressed: { backgroundColor: Colors.primaryHover },
  ctaText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  footer: { gap: Space[2], paddingTop: Space[2] },
  error: { ...Type.small, color: Colors.dangerInk },
  note: { ...Type.small, color: Colors.inkMuted },
});
