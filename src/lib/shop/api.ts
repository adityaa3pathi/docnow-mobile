/** One typed call per catalog route, so shop screens never write raw URLs. */
import { api } from '@/lib/api';

import { toCatalogParams, type ProductQuery } from './query';
import type { DealType } from './slug';
import type { CachedDetails, CatalogProduct, ProductCategory, ProductDetail, ProductPage } from './types';

const get = <T>(url: string, params?: Record<string, string | number>) =>
  api.get<T>(url, { params }).then((r) => r.data);

interface PartnerDetailsReply {
  status?: boolean;
  data?: {
    fasting?: string;
    fasting_time?: string;
    reporting_time?: string;
    gender?: string;
    description?: string;
    constituents?: { id?: string | number; name?: string }[];
  };
}

/** Maps the partner's snake_case reply onto the shape the server caches on the catalog row. */
function toCachedDetails(reply: PartnerDetailsReply): CachedDetails | null {
  if (!reply?.status || !reply.data) return null;
  const d = reply.data;
  return {
    fasting: d.fasting ?? null,
    fastingTime: d.fasting_time ?? null,
    reportingTime: d.reporting_time ?? null,
    gender: typeof d.gender === 'string' ? d.gender.split(',').map((g) => g.trim()).filter(Boolean) : [],
    description: d.description ?? null,
    constituents: (d.constituents ?? [])
      .map((c) => ({ id: String(c.id ?? ''), name: (c.name ?? '').trim() }))
      .filter((c) => c.name),
  };
}

export const catalogApi = {
  featured: (type: string, limit: number) =>
    get<{ products?: CatalogProduct[] }>('/api/catalog/featured', { type, limit }).then((d) => d.products ?? []),
  search: (query: ProductQuery) => get<ProductPage>('/api/catalog/products', toCatalogParams(query)),
  product: (code: string) => get<ProductDetail>(`/api/catalog/products/${encodeURIComponent(code)}`),
  categories: () =>
    get<{ categories?: (ProductCategory & { description?: string | null })[] }>('/api/catalog/categories')
      // The route also returns every item in each category; the chips only need the names.
      .then((d) => (d.categories ?? []).map(({ id, name, slug }) => ({ id, name, slug }))),
  partnerDetails: (dealType: DealType, dealTypeId: string) =>
    get<PartnerDetailsReply>(`/api/catalog/product-details/${dealType}/${encodeURIComponent(dealTypeId)}`).then(toCachedDetails),
};
