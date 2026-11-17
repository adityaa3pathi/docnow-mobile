import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { AddToCart } from '@/components/shop/add-to-cart';
import { LightStatusBar } from '@/components/ui/light-status-bar';
import { Colors, Fonts, Radius, Shadow, Space, Type } from '@/constants/theme';
import { countForCode, inCartLabel, useCart } from '@/lib/cart';
import { errorStatus, friendlyError } from '@/lib/consult/api';
import {
  discountPercent,
  formatPrice,
  getCustomPurpose,
  getPurposeHeading,
  mergeProductFacts,
  parameterCount,
  parameterCountLabel,
  typeLabel,
} from '@/lib/shop/product-text';
import { codeFromSlug } from '@/lib/shop/slug';
import { useProduct, usePartnerDetails } from '@/lib/shop/use-catalog';

const SHORT_LIST = 8;

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const code = codeFromSlug(slug ?? '');
  const insets = useSafeAreaInsets();
  const { cart } = useCart();
  const product = useProduct(code);
  const partner = usePartnerDetails(product.data);
  const [showAll, setShowAll] = useState(false);

  if (product.isLoading) return <LoadingBlock label="Loading test" />;
  if (!product.data) {
    const notFound = errorStatus(product.error) === 404;
    return (
      <View style={styles.pad}>
        {notFound ? (
          <EmptyState title="Test not found" body="This test is not available right now." />
        ) : (
          <ErrorState message={friendlyError(product.error)} onRetry={() => void product.refetch()} />
        )}
      </View>
    );
  }

  const p = product.data;
  const facts = mergeProductFacts(p, partner.data);
  const purpose = getCustomPurpose(p.purpose);
  const count = parameterCount(p);
  const discount = discountPercent(p.price, p.mrp);
  const inCart = countForCode(cart, p.partnerCode);
  const shown = showAll ? facts.constituents : facts.constituents.slice(0, SHORT_LIST);
  const factRows = [
    { label: 'Sample', value: facts.sampleType },
    { label: 'Fasting', value: facts.fasting },
    { label: 'Reports in', value: facts.reportTime },
    { label: 'Ideal for', value: facts.idealFor },
  ].filter((row) => row.value);

  return (
    <View style={styles.flex}>
      <LightStatusBar />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.band}>
          <Text style={styles.kind}>
            {typeLabel(p.type)} · {parameterCountLabel(count)}
          </Text>
          <Text style={styles.name} accessibilityRole="header">
            {p.name}
          </Text>
          {inCart > 0 && (
            <Text style={styles.bandInCart} accessibilityLiveRegion="polite">
              {inCartLabel(inCart)}
            </Text>
          )}
        </View>

        {factRows.length > 0 && (
          <View style={styles.card}>
            {factRows.map((row) => (
              <View key={row.label} style={styles.factRow}>
                <Text style={styles.factLabel}>{row.label}</Text>
                <Text style={styles.factValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {purpose && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              {getPurposeHeading(p.type)}
            </Text>
            <Text style={styles.body}>{purpose}</Text>
          </View>
        )}

        {facts.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              About this {typeLabel(p.type).toLowerCase()}
            </Text>
            <Text style={styles.body}>{facts.description}</Text>
          </View>
        )}

        {shown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              What is measured
            </Text>
            {shown.map((item, index) => (
              <Text key={`${item.id}-${item.name}`} style={styles.listItem}>
                {index + 1}. {item.name}
              </Text>
            ))}
            {facts.constituents.length > SHORT_LIST && (
              <Pressable
                onPress={() => setShowAll((open) => !open)}
                style={styles.toggle}
                accessibilityRole="button"
                accessibilityLabel={showAll ? 'Show fewer parameters' : `Show all ${facts.constituents.length} parameters`}
                accessibilityState={{ expanded: showAll }}>
                <Text style={styles.toggleText}>
                  {showAll ? 'Show fewer' : `Show all ${facts.constituents.length}`}
                </Text>
              </Pressable>
            )}
            {facts.unnamedConstituents > 0 && (
              <Text style={styles.muted}>
                {facts.unnamedConstituents} more {facts.unnamedConstituents === 1 ? 'parameter is' : 'parameters are'} not
                listed by the lab.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Price and the one action stay in reach, however long the parameter list runs. */}
      <View style={[styles.bar, { paddingBottom: Space[3] + insets.bottom }]}>
        <View style={styles.barText}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(p.price)}</Text>
            {p.mrp ? <Text style={styles.mrp}>{formatPrice(p.mrp)}</Text> : null}
          </View>
          {discount !== null && <Text style={styles.discount}>{discount}% off</Text>}
        </View>
        <AddToCart product={p} size="bar" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  pad: { padding: Space[4] },
  content: { paddingBottom: Space[8], gap: Space[4] },
  band: { backgroundColor: Colors.primaryHover, paddingHorizontal: Space[4], paddingBottom: Space[6], gap: Space[2] },
  kind: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primarySoft },
  name: { ...Type.title, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  bandInCart: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  card: { marginHorizontal: Space[4], padding: Space[4], gap: Space[2], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  cardTitle: { ...Type.bodyStrong, color: Colors.ink },
  body: { ...Type.small, color: Colors.inkMuted },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
  factLabel: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkSubtle, width: 96 },
  factValue: { ...Type.small, flex: 1, color: Colors.ink },
  listItem: { ...Type.small, color: Colors.ink },
  muted: { ...Type.small, color: Colors.inkMuted },
  toggle: { minHeight: 44, justifyContent: 'center' },
  toggleText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], paddingHorizontal: Space[4], paddingTop: Space[3], borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, ...Shadow.raised },
  barText: { flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space[2] },
  price: { ...Type.titleSm, fontFamily: Fonts.bold, color: Colors.ink, fontVariant: ['tabular-nums'] },
  mrp: { ...Type.small, color: Colors.inkSubtle, textDecorationLine: 'line-through' },
  discount: { ...Type.small, fontFamily: Fonts.medium, color: Colors.successInk },
});
