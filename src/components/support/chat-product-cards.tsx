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
import { discountPercent, formatPrice } from '@/lib/shop/product-text';
import { cardFacts, cardProductPath } from '@/lib/support/cards';
import type { ChatProductCard } from '@/lib/support/types';

/** One test the bot found. Add behaves exactly as on a product card: idempotent, and a second
 *  tap is a deliberate line for another person. */
function CardRow({ card }: { card: ChatProductCard }) {
  const { cart, signedIn } = useCart();
  const add = useAddToCart();
  const requireSignIn = useRequireSignIn();
  const [state, dispatch] = useReducer(addReducer, newIdempotencyKey(), initialAddState);

  const count = countForCode(cart, card.code);
  const view = addButtonView(count, state.phase);
  const label = signedIn ? view.label : 'Sign in to add';
  const facts = cardFacts(card);
  const off = discountPercent(card.price, card.mrp);

  const press = () =>
    requireSignIn(() => {
      if (view.busy) return;
      dispatch({ type: 'tap' });
      add
        .mutateAsync({ testCode: card.code, idempotencyKey: state.key })
        .then(() => dispatch({ type: 'added', nextKey: newIdempotencyKey() }))
        .catch(() => dispatch({ type: 'failed' }));
    });

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(cardProductPath(card))}
        style={({ pressed }) => [styles.nameTap, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={`${card.name}. Open details`}>
        <Text style={styles.name}>{card.name}</Text>
      </Pressable>

      {facts.length > 0 && <Text style={styles.facts}>{facts.join(' · ')}</Text>}

      <View style={styles.priceRow}>
        <Text style={styles.price}>
          {formatPrice(card.price)}
          {card.mrp ? <Text style={styles.mrp}> {formatPrice(card.mrp)}</Text> : null}
        </Text>
        {off ? <Text style={styles.off}>{off}% off</Text> : null}
      </View>

      <View style={styles.actions}>
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
            view.inCart && styles.buttonAgain,
            pressed && (view.inCart ? styles.pressed : styles.buttonPressed),
            view.busy && styles.busy,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${card.name}, ${formatPrice(card.price)}`}
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

export function ChatProductCards({ cards }: { cards: ChatProductCard[] }) {
  if (cards.length === 0) return null;
  return (
    <View style={styles.list} accessibilityLabel="Tests found">
      {cards.map((card) => (
        <CardRow key={card.code} card={card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Space[2], marginTop: Space[2] },
  card: { gap: Space[1], padding: Space[3], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  nameTap: { minHeight: 44, justifyContent: 'center' },
  name: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
  facts: { ...Type.caption, fontSize: 14, lineHeight: 20, color: Colors.inkMuted },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2], marginTop: Space[1] },
  price: { ...Type.body, fontFamily: Fonts.bold, color: Colors.ink },
  mrp: { ...Type.small, fontFamily: Fonts.regular, color: Colors.inkSubtle, textDecorationLine: 'line-through' },
  off: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Space[2], marginTop: Space[2] },
  inCart: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  inCartText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonPressed: { backgroundColor: Colors.primaryHover },
  buttonAgain: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
  buttonAgainText: { color: Colors.ink },
  buttonText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  busy: { opacity: 0.7 },
  pressed: { backgroundColor: Colors.surfaceMuted },
  error: { ...Type.small, color: Colors.dangerInk, marginTop: Space[1] },
});
