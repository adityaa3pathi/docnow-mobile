import { describe, expect, it } from 'vitest';

import {
  cleanProductText,
  discountPercent,
  fastingLabel,
  formatPrice,
  getCardSummary,
  getPurposeHeading,
  mergeProductFacts,
  parameterCount,
  parameterCountLabel,
  reportLabel,
  typeLabel,
} from './product-text';
import type { ProductDetail } from './types';

describe('cleanProductText', () => {
  it('strips tags, decodes entities and collapses spaces', () => {
    expect(cleanProductText('Checks iron &amp; <b>B12</b><br/> levels')).toBe('Checks iron & B12 levels');
  });

  it('treats partner placeholders for nothing as blank', () => {
    expect(cleanProductText('na')).toBeNull();
    expect(cleanProductText('N/A')).toBeNull();
    expect(cleanProductText('   ')).toBeNull();
    expect(cleanProductText(null)).toBeNull();
  });

  it('replaces the city token, since the app card has no city', () => {
    expect(cleanProductText('Sample pickup in {City_Name}')).toBe('Sample pickup in your city');
  });
});

describe('getCardSummary', () => {
  it('prefers the manager-written purpose', () => {
    expect(getCardSummary('For tiredness', 'Partner blurb')).toEqual({ text: 'For tiredness', isCustom: true });
  });

  it('falls back to the partner description', () => {
    expect(getCardSummary('na', 'Partner blurb')).toEqual({ text: 'Partner blurb', isCustom: false });
  });

  it('is null when both are blank', () => {
    expect(getCardSummary(null, 'n/a')).toBeNull();
  });
});

describe('labels', () => {
  it('words the purpose heading for the type', () => {
    expect(getPurposeHeading('PACKAGE')).toBe('What this package is for');
    expect(getPurposeHeading('PROFILE')).toBe('What this profile is for');
    expect(getPurposeHeading('TEST')).toBe('What this test is for');
    expect(getPurposeHeading(null)).toBe('What this test is for');
  });

  it('names the type plainly', () => {
    expect(typeLabel('PARAMETER')).toBe('Test');
    expect(typeLabel('PACKAGE')).toBe('Package');
  });

  it('does not repeat the word fasting', () => {
    expect(fastingLabel('10 hours')).toBe('Fasting: 10 hours');
    expect(fastingLabel('Fasting required')).toBe('Fasting required');
    expect(fastingLabel('na')).toBe('Fasting not specified');
  });

  it('says when report time is unknown', () => {
    expect(reportLabel('24 hours')).toBe('Reports in 24 hours');
    expect(reportLabel(null)).toBe('Report time varies');
  });
});

describe('price display', () => {
  it('shows server rupees in Indian grouping', () => {
    expect(formatPrice(1200)).toBe('₹1,200');
  });

  it('works out the saving only when the MRP is higher', () => {
    expect(discountPercent(750, 1000)).toBe(25);
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1000)).toBeNull();
  });
});

describe('parameterCount', () => {
  it('uses the server summary first', () => {
    const count = parameterCount({
      type: 'PACKAGE',
      parameters: '40 tests',
      detailsSummary: { testCount: 62, constituentsPreview: [], remainingConstituents: 0, fastingLabel: null, idealFor: null, reportingTime: null },
    });
    expect(count).toBe(62);
  });

  it('reads a number out of the parameters text', () => {
    expect(parameterCount({ type: 'PACKAGE', parameters: '40 tests included' })).toBe(40);
  });

  it('counts a single test as one, and leaves a package unknown', () => {
    expect(parameterCount({ type: 'TEST', parameters: null })).toBe(1);
    expect(parameterCount({ type: 'PACKAGE', parameters: null })).toBeNull();
  });

  it('words the count for a screen reader', () => {
    expect(parameterCountLabel(1)).toBe('1 parameter');
    expect(parameterCountLabel(62)).toBe('62 parameters');
    expect(parameterCountLabel(null)).toBe('Parameters vary');
  });
});

const base: ProductDetail = {
  id: 'c1',
  partnerCode: 'package_94',
  name: 'Full body checkup',
  type: 'PACKAGE',
  price: 1499,
  mrp: 2400,
  sampleType: 'Blood',
  reportTime: '36 hours',
  description: 'Catalog blurb',
};

describe('mergeProductFacts', () => {
  it('lets a live partner reply win over the cached copy', () => {
    const facts = mergeProductFacts(
      { ...base, detailsData: { reportingTime: '48 hours', constituents: [{ id: '1', name: 'Haemoglobin' }] } },
      { reportingTime: '24 hours', fasting: 'Required', fastingTime: '10 hours', gender: ['Male', 'Female'], constituents: [{ id: '1', name: 'Haemoglobin' }, { id: '2', name: 'Platelets' }] },
    );
    expect(facts.reportTime).toBe('24 hours');
    expect(facts.fasting).toBe('Required 10 hours');
    expect(facts.idealFor).toBe('Male, Female');
    expect(facts.constituents.map((c) => c.name)).toEqual(['Haemoglobin', 'Platelets']);
  });

  it('falls back to the cached copy, then the catalog row', () => {
    const facts = mergeProductFacts({ ...base, detailsData: { constituents: [] } }, null);
    expect(facts.reportTime).toBe('36 hours');
    expect(facts.sampleType).toBe('Blood');
    expect(facts.description).toBe('Catalog blurb');
    expect(facts.constituents).toEqual([]);
  });

  it('uses the summary preview and reports the parameters the lab did not name', () => {
    const facts = mergeProductFacts({
      ...base,
      detailsSummary: { testCount: 5, constituentsPreview: ['Haemoglobin', 'Platelets'], remainingConstituents: 3, fastingLabel: 'Required', idealFor: 'All', reportingTime: '36 hours' },
    });
    expect(facts.constituents.map((c) => c.name)).toEqual(['Haemoglobin', 'Platelets']);
    expect(facts.unnamedConstituents).toBe(3);
    expect(facts.fasting).toBe('Required');
    expect(facts.idealFor).toBe('All');
  });
});
