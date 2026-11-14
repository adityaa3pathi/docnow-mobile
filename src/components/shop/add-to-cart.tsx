import { router } from 'expo-router';
import { useReducer } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import {
  addButtonView,
  addReducer,
  countForCode,
  initialAddState,
  newIdempotencyKey,
  useAddToCart,
  useCart,
  useRequireSignIn,
} from '@/lib/cart';
import { friendlyError } from '@/lib/consult/api';
import { formatPrice } from '@/lib/shop/product-text';

interface Props {
  product: { partnerCode: string; name: string; price: number };
  /** `bar` is the wider button on the detail screen's sticky bar. */
  size?: 'card' | 'bar';
}

/**
 * The add control and its three states, as on the website chat cards: add, in cart, and
 * add for another person. Each tap carries its own idempotency key, so a retry adds once.
 */
export function AddToCart({ product, size = 'card' }: Props) {
  const { cart, signedIn } = useCart();
  const add = useAddToCart();
  const requireSignIn = useRequireSignIn();
  const [state, dispatch] = useReducer(addReducer, newIdempotencyKey(), initialAddState);

  const count = countForCode(cart, product.partnerCode);
  const view = addButtonView(count, state.phase);
  const label = signedIn ? view.label : 'Sign in to add';

  const press = () =>
    requireSignIn(() => {
      if (view.busy) return;
      dispatch({ type: 'tap' });
      add
        .mutateAsync({ testCode: product.partnerCode, idempotencyKey: state.key })
        .then(() => dispatch({ type: 'added', nextKey: newIdempotencyKey() }))
        .catch(() => dispatch({ type: 'failed' }));
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {view.inCart && (
          <Pressable
            onPress={() => router.push('/shop/cart')}
            style={styles.inCart}
            accessibilityRole="button"
            accessibilityLabel={`${view.inCartLabel}. Open cart`}
            accessibilityLiveRegion="polite">
            <Text style={styles.inCartText}>{view.inCartLabel}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={press}
          disabled={view.busy}
          style={({ pressed }) => [
            styles.button,
            size === 'bar' && styles.buttonBar,
            view.inCart && styles.buttonAgain,
            pressed && (view.inCart ? styles.buttonAgainPressed : styles.buttonPressed),
            view.busy && styles.buttonBusy,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${product.name}, ${formatPrice(product.price)}`}
          accessibilityState={{ busy: view.busy, disabled: view.busy }}>
          <Text style={[styles.buttonText, view.inCart && styles.buttonAgainText]} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </View>
      {add.isError && !view.busy && (
        <Text style={styles.error} accessibilityRole="alert">
          {friendlyError(add.error, 'Could not add this to your cart. Please try again.')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Space[2] },
  inCart: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  inCartText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonBar: { paddingHorizontal: Space[6] },
  buttonPressed: { backgroundColor: Colors.primaryHover },
  // A second line for another person is the quieter action, so it drops to an outline.
  buttonAgain: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
  buttonAgainPressed: { backgroundColor: Colors.surfaceMuted },
  buttonAgainText: { color: Colors.ink },
  buttonBusy: { opacity: 0.7 },
  buttonText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  error: { ...Type.small, color: Colors.dangerInk, marginTop: Space[2], textAlign: 'right' },
});
