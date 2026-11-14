import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chips } from '@/components/shop/chips';
import { Pager } from '@/components/shop/pager';
import { ProductCard } from '@/components/shop/product-card';
import { SearchField } from '@/components/shop/search-field';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { friendlyError } from '@/lib/consult/api';
import {
  EMPTY_QUERY,
  FIRST_PAGE,
  filterKey,
  isBrowsing,
  pageFor,
  resultsLabel,
  TYPE_FILTERS,
  type Filters,
  type PageState,
  type ProductQuery,
  type TypeFilter,
} from '@/lib/shop/query';
import type { CatalogProduct } from '@/lib/shop/types';
import { useCategories, useFeaturedPackages, useFeaturedTests, useProductSearch } from '@/lib/shop/use-catalog';

export default function TestsScreen() {
  const [input, setInput] = useState('');
  const typed = useDebouncedValue(input);
  const [type, setType] = useState<TypeFilter>(EMPTY_QUERY.type);
  const [category, setCategory] = useState<string | null>(EMPTY_QUERY.category);
  const [pageState, setPageState] = useState<PageState>(FIRST_PAGE);

  // The page is derived, so changing a filter cannot leave the list on a page that no longer exists.
  const filters: Filters = { search: typed, type, category };
  const query: ProductQuery = { ...filters, page: pageFor(pageState, filters) };

  const browsing = isBrowsing(query);
  const categories = useCategories();
  const results = useProductSearch(query);
  const packages = useFeaturedPackages(browsing);
  const featuredTests = useFeaturedTests(browsing);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchField value={input} onChange={setInput} />
        <Chips
          options={TYPE_FILTERS}
          value={query.type}
          onChange={(value) => setType((value as TypeFilter | null) ?? 'ALL')}
          groupLabel="Filter by kind"
        />
      </View>

      {browsing ? (
        <ScrollView contentContainerStyle={styles.browse} keyboardShouldPersistTaps="handled">
          <CampsLink />
          {categories.data && categories.data.length > 0 && (
            <View style={styles.block}>
              <SectionTitle title="Browse by category" />
              <Chips
                options={categories.data.map((c) => ({ value: c.slug, label: c.name }))}
                value={query.category}
                onChange={setCategory}
                groupLabel="Browse by category"
                clearable
              />
            </View>
          )}
          <FeaturedBlock title="Popular health packages" note="Full checkups put together by doctors." query={packages} />
          <FeaturedBlock
            title="Lab tests and profiles"
            note="Single tests and grouped profiles for a specific concern."
            query={featuredTests}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={results.data?.products ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: CatalogProduct }) => <ProductCard product={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.block}>
              {categories.data && categories.data.length > 0 && (
                <Chips
                  options={categories.data.map((c) => ({ value: c.slug, label: c.name }))}
                  value={query.category}
                  onChange={setCategory}
                  groupLabel="Browse by category"
                  clearable
                />
              )}
              {results.data && (
                <Text style={styles.count} accessibilityLiveRegion="polite">
                  {resultsLabel(results.data.totalCount, query.search)}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            results.isLoading ? (
              <LoadingBlock label="Loading tests" />
            ) : results.isError ? (
              <View style={styles.pad}>
                <ErrorState message={friendlyError(results.error)} onRetry={() => void results.refetch()} />
              </View>
            ) : (
              <View style={styles.pad}>
                <EmptyState title="No matches" body="Try a shorter word, or clear the filters." />
              </View>
            )
          }
          ListFooterComponent={
            <Pager
              page={query.page}
              totalPages={results.data?.totalPages ?? 1}
              busy={results.isFetching}
              onChange={(page) => setPageState({ key: filterKey(filters), page })}
            />
          }
        />
      )}
    </View>
  );
}

/** The way into health camps, in the website's own words. */
function CampsLink() {
  return (
    <View style={styles.block}>
      <Pressable
        onPress={() => router.push('/camps')}
        accessibilityRole="button"
        accessibilityLabel="Health camps near you. Affordable walk-in health checkups at a location near you, no home visit needed"
        style={({ pressed }) => [styles.camps, pressed && styles.campsPressed]}>
        <Text style={styles.campsTitle}>Health camps</Text>
        <Text style={styles.campsBody}>
          Affordable walk-in health checkups at a location near you — no home visit needed
        </Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

interface FeaturedQuery {
  data?: CatalogProduct[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

function FeaturedBlock({ title, note, query }: { title: string; note: string; query: FeaturedQuery }) {
  if (!query.isLoading && !query.isError && (query.data ?? []).length === 0) return null;
  return (
    <View style={styles.block}>
      <SectionTitle title={title} note={note} />
      <View style={styles.cards}>
        {query.isLoading && <LoadingBlock label={`Loading ${title.toLowerCase()}`} />}
        {query.isError && <ErrorState message={friendlyError(query.error)} onRetry={() => void query.refetch()} />}
        {(query.data ?? []).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  header: { gap: Space[3], paddingTop: Space[3], paddingBottom: Space[3], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  browse: { paddingVertical: Space[4], gap: Space[6] },
  list: { paddingVertical: Space[4], gap: Space[4], paddingHorizontal: Space[4] },
  block: { gap: Space[3] },
  titleBlock: { paddingHorizontal: Space[4], gap: Space[1] },
  title: { ...Type.titleSm, color: Colors.ink },
  note: { ...Type.small, color: Colors.inkMuted },
  cards: { paddingHorizontal: Space[4], gap: Space[4] },
  count: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted, paddingHorizontal: Space[4] },
  pad: { padding: Space[4] },
  camps: {
    gap: Space[1],
    marginHorizontal: Space[4],
    minHeight: 44,
    padding: Space[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  campsPressed: { backgroundColor: Colors.surfaceMuted },
  campsTitle: { ...Type.bodyStrong, color: Colors.primary },
  campsBody: { ...Type.small, color: Colors.inkMuted },
});
