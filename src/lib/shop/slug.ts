// Ported from docnowtesting/client/src/lib/mapProductDetails.ts so app links match website URLs.
import type { ProductType } from './types';

export type DealType = 'package' | 'profile' | 'parameter';

const DEAL_TYPES: DealType[] = ['package', 'profile', 'parameter'];

/** Website product URLs read `name--partnerCode`; the app reuses them so deep links line up. */
export function productSlug(name: string, partnerCode: string): string {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return safeName ? `${safeName}--${partnerCode}` : partnerCode;
}

/** Everything after `--` is the partner code the catalog route needs; a bare code also works. */
export function codeFromSlug(slug: string): string {
  const raw = slug.includes('--') ? (slug.split('--').pop() ?? '') : slug;
  return raw.trim();
}

/** `profile_16` carries the deal type the partner's rich-details route wants. */
export function dealFromCode(partnerCode: string, type?: ProductType): { dealType: DealType; dealTypeId: string } | null {
  const underscore = partnerCode.indexOf('_');
  if (underscore !== -1) {
    const prefix = partnerCode.slice(0, underscore);
    const dealTypeId = partnerCode.slice(underscore + 1);
    if (dealTypeId && DEAL_TYPES.includes(prefix as DealType)) {
      return { dealType: prefix as DealType, dealTypeId };
    }
    return null;
  }
  // Older codes are plain numbers, so the item type tells us which partner route to use.
  if (!/^\d+$/.test(partnerCode) || !type) return null;
  if (type === 'PACKAGE') return { dealType: 'package', dealTypeId: partnerCode };
  if (type === 'PROFILE') return { dealType: 'profile', dealTypeId: partnerCode };
  return { dealType: 'parameter', dealTypeId: partnerCode };
}
