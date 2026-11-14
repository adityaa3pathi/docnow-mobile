// Ported from the city dialog in docnowtesting/client/src/components/Header.tsx: search covers
// every city, and without a search the top cities sit above the rest.
import { NO_CITY, OTHER_CITIES, TOP_CITIES } from './cities-data';

export { NO_CITY, OTHER_CITIES, TOP_CITIES };

/** Top cities and the rest, de-duplicated and A to Z; this is what a search looks through. */
export const ALL_CITIES: readonly string[] = Array.from(new Set([...TOP_CITIES, ...OTHER_CITIES])).sort((a, b) =>
  a.localeCompare(b),
);

/** The "Other cities" list: everything already shown in the top grid is left out. */
export const REST_OF_CITIES: readonly string[] = OTHER_CITIES.filter(
  (city) => !(TOP_CITIES as readonly string[]).includes(city),
);

/** A search matches anywhere in the name, case-insensitively, across every city. */
export function filterCities(search: string): readonly string[] {
  const query = search.trim().toLowerCase();
  if (!query) return REST_OF_CITIES;
  return ALL_CITIES.filter((city) => city.toLowerCase().includes(query));
}

/** The top grid is hidden while a search is running, because the results already cover it. */
export function showsTopCities(search: string): boolean {
  return search.trim().length === 0;
}

export function cityButtonLabel(city: string | null | undefined): string {
  return city && city !== NO_CITY ? city : NO_CITY;
}
