/** The search screen's filter state, and how it turns into catalog query parameters. */

export type TypeFilter = 'ALL' | 'TEST' | 'PACKAGE' | 'PROFILE';

export const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'TEST', label: 'Tests' },
  { value: 'PACKAGE', label: 'Packages' },
  { value: 'PROFILE', label: 'Profiles' },
];

export const PAGE_SIZE = 12;

export interface ProductQuery {
  search: string;
  type: TypeFilter;
  category: string | null;
  page: number;
}

export type Filters = Omit<ProductQuery, 'page'>;

export const EMPTY_QUERY: ProductQuery = { search: '', type: 'ALL', category: null, page: 1 };

/** True while no filter is set, which is when the tab shows categories and featured items. */
export function isBrowsing(query: Filters): boolean {
  return !query.search.trim() && query.type === 'ALL' && !query.category;
}

export function filterKey(filters: Filters): string {
  return [filters.search.trim(), filters.type, filters.category ?? ''].join('|');
}

export interface PageState {
  key: string;
  page: number;
}

export const FIRST_PAGE: PageState = { key: '', page: 1 };

/** A page number belongs to the filters it was turned to, so changed filters start at one again. */
export function pageFor(state: PageState, filters: Filters): number {
  return state.key === filterKey(filters) ? Math.max(1, state.page) : 1;
}

export function toCatalogParams(query: ProductQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: Math.max(1, query.page), limit: PAGE_SIZE };
  if (query.type !== 'ALL') params.type = query.type;
  if (query.search.trim()) params.search = query.search.trim();
  if (query.category) params.category = query.category;
  return params;
}

export function resultsLabel(totalCount: number, search: string): string {
  const term = search.trim();
  const noun = totalCount === 1 ? 'result' : 'results';
  return term ? `${totalCount} ${noun} for "${term}"` : `${totalCount} ${noun}`;
}
