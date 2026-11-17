import { describe, expect, it } from 'vitest';

import { EMPTY_QUERY, filterKey, FIRST_PAGE, isBrowsing, PAGE_SIZE, pageFor, resultsLabel, toCatalogParams } from './query';

describe('isBrowsing', () => {
  it('is true only with no search, no kind and no category', () => {
    expect(isBrowsing(EMPTY_QUERY)).toBe(true);
    expect(isBrowsing({ ...EMPTY_QUERY, search: '  ' })).toBe(true);
    expect(isBrowsing({ ...EMPTY_QUERY, search: 'cbc' })).toBe(false);
    expect(isBrowsing({ ...EMPTY_QUERY, type: 'PACKAGE' })).toBe(false);
    expect(isBrowsing({ ...EMPTY_QUERY, category: 'diabetes' })).toBe(false);
  });
});

describe('toCatalogParams', () => {
  it('sends only the filters that are set', () => {
    expect(toCatalogParams(EMPTY_QUERY)).toEqual({ page: 1, limit: PAGE_SIZE });
  });

  it('trims the search term and passes the kind through', () => {
    expect(toCatalogParams({ search: '  cbc ', type: 'PROFILE', category: 'diabetes', page: 3 })).toEqual({
      page: 3,
      limit: PAGE_SIZE,
      type: 'PROFILE',
      search: 'cbc',
      category: 'diabetes',
    });
  });

  it('never asks for a page below one', () => {
    expect(toCatalogParams({ ...EMPTY_QUERY, page: 0 }).page).toBe(1);
  });
});

describe('filterKey', () => {
  it('ignores spaces around the term, and separates the parts', () => {
    expect(filterKey({ search: ' cbc ', type: 'PACKAGE', category: 'diabetes' })).toBe('cbc|PACKAGE|diabetes');
    expect(filterKey({ search: '', type: 'ALL', category: null })).toBe('|ALL|');
  });

  it('tells apart a category and a search term with the same text', () => {
    expect(filterKey({ search: 'thyroid', type: 'ALL', category: null })).not.toBe(
      filterKey({ search: '', type: 'ALL', category: 'thyroid' }),
    );
  });
});

describe('pageFor', () => {
  const filters = { search: 'cbc', type: 'ALL' as const, category: null };

  it('keeps the page the person turned to', () => {
    expect(pageFor({ key: filterKey(filters), page: 3 }, filters)).toBe(3);
  });

  it('starts again at one when the filters change', () => {
    expect(pageFor({ key: filterKey(filters), page: 3 }, { ...filters, type: 'PACKAGE' })).toBe(1);
    expect(pageFor(FIRST_PAGE, filters)).toBe(1);
  });

  it('never returns a page below one', () => {
    expect(pageFor({ key: filterKey(filters), page: 0 }, filters)).toBe(1);
  });
});

describe('resultsLabel', () => {
  it('names the term and agrees in number', () => {
    expect(resultsLabel(1, 'cbc')).toBe('1 result for "cbc"');
    expect(resultsLabel(24, ' cbc ')).toBe('24 results for "cbc"');
    expect(resultsLabel(0, '')).toBe('0 results');
  });
});
