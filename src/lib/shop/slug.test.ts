import { describe, expect, it } from 'vitest';

import { codeFromSlug, dealFromCode, productSlug } from './slug';

describe('productSlug', () => {
  it('keeps the website format of name then partner code', () => {
    expect(productSlug('Torch-4 IgG', 'profile_16')).toBe('torch-4-igg--profile_16');
  });

  it('trims punctuation into single hyphens', () => {
    expect(productSlug('Vitamin B12 (Cyanocobalamin)', 'parameter_2')).toBe('vitamin-b12-cyanocobalamin--parameter_2');
  });

  it('falls back to the code when the name has no letters', () => {
    expect(productSlug('— —', 'package_94')).toBe('package_94');
  });
});

describe('codeFromSlug', () => {
  it('reads the code after the double hyphen', () => {
    expect(codeFromSlug('torch-4-igg--profile_16')).toBe('profile_16');
  });

  it('accepts a bare partner code', () => {
    expect(codeFromSlug('package_94')).toBe('package_94');
  });

  it('keeps underscores in a name that also has them', () => {
    expect(codeFromSlug('full-body--parameter_12_3')).toBe('parameter_12_3');
  });
});

describe('dealFromCode', () => {
  it('splits a prefixed code', () => {
    expect(dealFromCode('profile_16')).toEqual({ dealType: 'profile', dealTypeId: '16' });
    expect(dealFromCode('package_94')).toEqual({ dealType: 'package', dealTypeId: '94' });
  });

  it('refuses a prefix that is not a deal type', () => {
    expect(dealFromCode('camp_5')).toBeNull();
  });

  it('uses the item type for an older numeric code', () => {
    expect(dealFromCode('1234', 'PACKAGE')).toEqual({ dealType: 'package', dealTypeId: '1234' });
    expect(dealFromCode('1234', 'TEST')).toEqual({ dealType: 'parameter', dealTypeId: '1234' });
  });

  it('gives up on a numeric code with no type', () => {
    expect(dealFromCode('1234')).toBeNull();
  });
});
