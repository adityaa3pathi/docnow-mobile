import { describe, expect, it } from 'vitest';

import { cardFacts, cardProductPath, toProductCards } from './cards';

const raw = {
  code: 'package_94',
  name: 'Full Body Checkup',
  type: 'PACKAGE',
  price: 1299,
  mrp: 2400,
  sample_type: 'Blood',
  report_time: '24 hours',
};

describe('toProductCards', () => {
  it('maps the server snake_case fields onto the card shape', () => {
    expect(toProductCards([raw])).toEqual([
      {
        code: 'package_94',
        name: 'Full Body Checkup',
        type: 'PACKAGE',
        price: 1299,
        mrp: 2400,
        sampleType: 'Blood',
        reportTime: '24 hours',
      },
    ]);
  });

  it('returns an empty list for anything that is not an array', () => {
    expect(toProductCards(undefined)).toEqual([]);
    expect(toProductCards(null)).toEqual([]);
    expect(toProductCards('cards')).toEqual([]);
    expect(toProductCards({ code: 'x' })).toEqual([]);
  });

  it('drops a card with no code, no name or a non-numeric price', () => {
    const cards = toProductCards([
      { ...raw, code: undefined },
      { ...raw, name: 42 },
      { ...raw, price: '1299' },
      raw,
    ]);
    expect(cards.map((c) => c.code)).toEqual(['package_94']);
  });

  it('defaults a missing type to TEST and the optional facts to null', () => {
    const [card] = toProductCards([{ code: 'c1', name: 'Vitamin D', price: 700 }]);
    expect(card.type).toBe('TEST');
    expect(card.mrp).toBeNull();
    expect(card.sampleType).toBeNull();
    expect(card.reportTime).toBeNull();
  });

  it('ignores an mrp or fact sent in the wrong type', () => {
    const [card] = toProductCards([{ ...raw, mrp: '2400', sample_type: 5, report_time: null }]);
    expect(card.mrp).toBeNull();
    expect(card.sampleType).toBeNull();
    expect(card.reportTime).toBeNull();
  });
});

describe('cardProductPath', () => {
  it('builds the website slug so a card opens the same product the website does', () => {
    expect(cardProductPath({ name: 'Full Body Checkup', code: 'package_94' })).toBe(
      '/shop/product/full-body-checkup--package_94',
    );
  });

  it('falls back to the bare code when the name has no usable characters', () => {
    expect(cardProductPath({ name: '!!!', code: 'profile_16' })).toBe('/shop/product/profile_16');
  });
});

describe('cardFacts', () => {
  it('labels the report time and keeps the sample type as sent', () => {
    expect(cardFacts(toProductCards([raw])[0])).toEqual(['Blood', 'Report 24 hours']);
  });

  it('is empty when the server sent neither fact', () => {
    expect(cardFacts(toProductCards([{ code: 'c1', name: 'Vitamin D', price: 700 }])[0])).toEqual([]);
  });
});
