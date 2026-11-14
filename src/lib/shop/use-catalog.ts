/** React Query hooks for the catalog. The server caches these routes, so a long staleTime is safe. */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogApi } from './api';
import { isBrowsing, toCatalogParams, type ProductQuery } from './query';
import { dealFromCode } from './slug';
import type { ProductDetail } from './types';

const FIVE_MINUTES = 5 * 60 * 1000;

export const shopKeys = {
  featured: (type: string) => ['shop', 'featured', type] as const,
  categories: () => ['shop', 'categories'] as const,
  search: (query: ProductQuery) => ['shop', 'search', toCatalogParams(query)] as const,
  product: (code: string) => ['shop', 'product', code] as const,
  partnerDetails: (code: string) => ['shop', 'partner-details', code] as const,
};

/** `enabled` is false while the tab shows search results, which hide the featured rows. */
export function useFeaturedPackages(enabled = true) {
  return useQuery({
    queryKey: shopKeys.featured('PACKAGE'),
    queryFn: () => catalogApi.featured('PACKAGE', 6),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

export function useFeaturedTests(enabled = true) {
  return useQuery({
    queryKey: shopKeys.featured('TEST,PROFILE'),
    queryFn: () => catalogApi.featured('TEST,PROFILE', 9),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

export function useCategories() {
  return useQuery({ queryKey: shopKeys.categories(), queryFn: catalogApi.categories, staleTime: FIVE_MINUTES });
}

/** Results for the current filters. Paging keeps the old page on screen while the next loads. */
export function useProductSearch(query: ProductQuery) {
  return useQuery({
    queryKey: shopKeys.search(query),
    queryFn: () => catalogApi.search(query),
    enabled: !isBrowsing(query),
    placeholderData: keepPreviousData,
    staleTime: FIVE_MINUTES,
  });
}

export function useProduct(code: string) {
  return useQuery({
    queryKey: shopKeys.product(code),
    queryFn: () => catalogApi.product(code),
    enabled: Boolean(code),
    staleTime: FIVE_MINUTES,
  });
}

/**
 * The partner's own details, for rows the server has not cached yet. A failure is not surfaced:
 * the screen still has the catalog row's facts.
 */
export function usePartnerDetails(product: ProductDetail | undefined) {
  const code = product?.partnerCode ?? '';
  const deal = product ? dealFromCode(product.partnerCode, product.type) : null;
  const needed = Boolean(deal) && !product?.detailsData?.constituents?.length;
  return useQuery({
    queryKey: shopKeys.partnerDetails(code),
    queryFn: () => catalogApi.partnerDetails(deal!.dealType, deal!.dealTypeId),
    enabled: needed,
    retry: false,
    staleTime: FIVE_MINUTES,
  });
}
