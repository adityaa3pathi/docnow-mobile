import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddToCart } from '@/components/shop/add-to-cart';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { countForCode, inCartLabel, useCart } from '@/lib/cart';
import {
  cleanProductText,
  discountPercent,
  fastingLabel,
  formatPrice,
  getCardSummary,
  getPurposeHeading,
  parameterCount,
  parameterCountLabel,
  reportLabel,
  typeLabel,
} from '@/lib/shop/product-text';
import { productSlug } from '@/lib/shop/slug';
import type { CatalogProduct } from '@/lib/shop/types';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { cart } = useCart();
  const inCart = countForCode(cart, product.partnerCode);
  const summary = getCardSummary(product.purpose, product.description);
  const count = parameterCount(product);
  const discount = discountPercent(product.price, product.mrp);
  const summaryDetails = product.detailsSummary;
  const sample = cleanProductText(product.sampleType);
  const facts = [
    sample && `Sample: ${sample}`,
    fastingLabel(summaryDetails?.fastingLabel),
    `Ideal for ${summaryDetails?.idealFor ?? 'all'}`,
    reportLabel(summaryDetails?.reportingTime ?? product.reportTime),
  ].filter((fact): fact is string => Boolean(fact));

  const open = () => router.push(`/shop/product/${productSlug(product.name, product.partnerCode)}`);
  const spoken = [
    product.name,
    typeLabel(product.type),
    parameterCountLabel(count),
    formatPrice(product.price),
    inCart > 0 ? inCartLabel(inCart) : '',
    'View details',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.card}>
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        accessibilityRole="button"
        accessibilityLabel={spoken}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={3}>
              {product.name}
            </Text>
            <Text style={styles.type}>
              {typeLabel(product.type)} · {parameterCountLabel(count)}
            </Text>
          </View>
          {inCart > 0 && (
            <View style={styles.inCart}>
              <Text style={styles.inCartText}>{inCartLabel(inCart)}</Text>
            </View>
          )}
        </View>

        {summary && (
          <View style={styles.summary}>
            {summary.isCustom && <Text style={styles.summaryHeading}>{getPurposeHeading(product.type)}</Text>}
            <Text style={styles.summaryText} numberOfLines={3}>
              {summary.text}
            </Text>
          </View>
        )}

        <View style={styles.facts}>
          {facts.map((fact) => (
            <Text key={fact} style={styles.fact} numberOfLines={1}>
              {fact}
            </Text>
          ))}
        </View>
        <Text style={styles.more}>View details</Text>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.priceBox}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.mrp ? <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text> : null}
          </View>
          {discount !== null && <Text style={styles.discount}>{discount}% off</Text>}
        </View>
        <AddToCart product={product} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  body: { padding: Space[4], gap: Space[3] },
  bodyPressed: { backgroundColor: Colors.surfaceSubtle },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
  headText: { flex: 1, gap: Space[1] },
  name: { ...Type.bodyLg, fontFamily: Fonts.semibold, color: Colors.ink },
  type: { ...Type.small, fontFamily: Fonts.medium, color: Colors.primary },
  inCart: { paddingHorizontal: Space[2], paddingVertical: Space[1], borderRadius: Radius.sm, backgroundColor: Colors.successSoft },
  inCartText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
  summary: { gap: Space[1] },
  summaryHeading: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.inkSubtle },
  summaryText: { ...Type.small, color: Colors.inkMuted },
  facts: { gap: Space[1], paddingTop: Space[3], borderTopWidth: 1, borderTopColor: Colors.border },
  fact: { ...Type.small, color: Colors.inkMuted },
  more: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingHorizontal: Space[4], paddingVertical: Space[3], borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  priceBox: { flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space[2] },
  price: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  mrp: { ...Type.small, color: Colors.inkSubtle, textDecorationLine: 'line-through' },
  discount: { ...Type.small, fontFamily: Fonts.medium, color: Colors.successInk },
});
