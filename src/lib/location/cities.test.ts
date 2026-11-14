import { describe, expect, it } from 'vitest';

import { ALL_CITIES, cityButtonLabel, filterCities, NO_CITY, REST_OF_CITIES, showsTopCities, TOP_CITIES } from './cities';
import { LANDMARKS } from './landmarks';

describe('top cities', () => {
  it('lists the ten top cities the website shows, with Jaipur first', () => {
    expect(TOP_CITIES).toHaveLength(10);
    expect(TOP_CITIES[0]).toBe('Jaipur');
  });

  it('has a landmark icon for every top city, and no spare icons', () => {
    for (const city of TOP_CITIES) {
      expect(LANDMARKS[city]?.d.length, city).toBeGreaterThan(0);
      expect(LANDMARKS[city]?.title, city).toBeTruthy();
    }
    expect(Object.keys(LANDMARKS).sort()).toEqual([...TOP_CITIES].sort());
  });
});

describe('ALL_CITIES', () => {
  it('covers the top cities and the long list, A to Z with no duplicates', () => {
    expect(ALL_CITIES).toEqual([...ALL_CITIES].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ALL_CITIES).size).toBe(ALL_CITIES.length);
    for (const city of TOP_CITIES) expect(ALL_CITIES).toContain(city);
  });

  it('includes a far-down city from the long list', () => {
    expect(ALL_CITIES).toContain('Visakhapatnam');
    expect(ALL_CITIES).toContain('Agra');
  });
});

describe('REST_OF_CITIES', () => {
  it('leaves out every city already shown in the top grid', () => {
    for (const city of TOP_CITIES) expect(REST_OF_CITIES).not.toContain(city);
  });

  it('drops Jaipur, which appears in both website lists', () => {
    expect(REST_OF_CITIES).not.toContain('Jaipur');
    expect(REST_OF_CITIES).toContain('Jodhpur');
  });
});

describe('filterCities', () => {
  it('shows the other-cities list when nothing is typed', () => {
    expect(filterCities('')).toEqual(REST_OF_CITIES);
    expect(filterCities('   ')).toEqual(REST_OF_CITIES);
  });

  it('searches every city, including the top ones', () => {
    expect(filterCities('jaipur')).toEqual(['Jaipur']);
    expect(filterCities('mumbai')).toEqual(['Mumbai']);
  });

  it('ignores case and matches anywhere in the name', () => {
    expect(filterCities('PUNE')).toContain('Pune');
    expect(filterCities('nagar')).toContain('Ambedkar Nagar');
    expect(filterCities('nagar')).toContain('Yamuna Nagar');
  });

  it('returns nothing for a city that is not served', () => {
    expect(filterCities('Atlantis')).toEqual([]);
  });

  it('returns results A to Z', () => {
    const results = [...filterCities('pur')];
    expect(results).toEqual([...results].sort((a, b) => a.localeCompare(b)));
  });
});

describe('showsTopCities', () => {
  it('hides the top grid only once a search is typed', () => {
    expect(showsTopCities('')).toBe(true);
    expect(showsTopCities('  ')).toBe(true);
    expect(showsTopCities('jai')).toBe(false);
  });
});

describe('cityButtonLabel', () => {
  it('shows the chosen city, or the prompt when there is none', () => {
    expect(cityButtonLabel('Jaipur')).toBe('Jaipur');
    expect(cityButtonLabel(NO_CITY)).toBe(NO_CITY);
    expect(cityButtonLabel(null)).toBe(NO_CITY);
    expect(cityButtonLabel('')).toBe(NO_CITY);
  });
});
