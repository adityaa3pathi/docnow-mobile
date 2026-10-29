import { describe, expect, it } from 'vitest';

import { packageFacts } from './package';

const base = { displayPrice: 2000, discountedPrice: null, parameters: null, reportTime: null, detailsData: null };

describe('packageFacts', () => {
  it('shows MRP and % OFF only for a real discount', () => {
    expect(packageFacts({ ...base, discountedPrice: 1399 })).toMatchObject({ price: 1399, mrp: 2000, offPercent: 30 });
    expect(packageFacts(base)).toMatchObject({ price: 2000, mrp: null, offPercent: null });
    expect(packageFacts({ ...base, discountedPrice: 2000 })).toMatchObject({ mrp: null, offPercent: null });
    expect(packageFacts({ ...base, displayPrice: 1000, discountedPrice: 995 })).toMatchObject({ mrp: 1000, offPercent: null });
  });

  it('counts parameters from details first, then the parameters label', () => {
    expect(packageFacts({ ...base, detailsData: { parametersCount: 72 }, parameters: '60 Parameters' }).parametersCount).toBe(72);
    expect(packageFacts({ ...base, parameters: '60 Parameters' }).parametersCount).toBe(60);
    expect(packageFacts({ ...base, detailsData: { parametersList: [{ name: 'Hb' }, { name: 'TSH' }] } }).parametersCount).toBe(2);
    expect(packageFacts({ ...base, parameters: 'Multiple' }).parametersCount).toBeNull();
  });

  it('reads fasting advice without guessing', () => {
    expect(packageFacts({ ...base, detailsData: { fastingAdvice: '10-12 hours fasting required' } }).fasting).toBe('required');
    expect(packageFacts({ ...base, detailsData: { fastingAdvice: 'No fasting required' } }).fasting).toBe('not-required');
    expect(packageFacts({ ...base, detailsData: { fastingAdvice: 'Fasting not required' } }).fasting).toBe('not-required');
    expect(packageFacts({ ...base, detailsData: { fastingAdvice: 'Drink plenty of water' } }).fasting).toBeNull();
    expect(packageFacts(base).fasting).toBeNull();
  });

  it('takes the report time from the item, then its details', () => {
    expect(packageFacts({ ...base, reportTime: '24 hrs' }).reportTime).toBe('24 hrs');
    expect(packageFacts({ ...base, detailsData: { reportTime: '48 hrs' } }).reportTime).toBe('48 hrs');
  });
});
