// Ported from docnowtesting/client/src/lib/productText.ts, plus the display-only number helpers
// the website keeps inside its cards. Prices arrive from the server; nothing here changes them.
import { formatRupees } from '@/lib/consult/format';

import type { CatalogProduct, ProductDetail, ProductFacts, ProductType } from './types';

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/** Partner copy arrives as HTML. `na` counts as blank, and the city token has no city here. */
export function cleanProductText(raw?: string | null): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/{City_Name}/gi, 'your city')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = text.toLowerCase();
  if (!text || lower === 'na' || lower === 'n/a') return null;
  return text;
}

/** Manager-written purpose, cleaned; null when it is effectively blank. */
export function getCustomPurpose(purpose?: string | null): string | null {
  return cleanProductText(purpose);
}

/** Card blurb: the manager-written purpose wins, the partner description is the fallback. */
export function getCardSummary(
  purpose?: string | null,
  description?: string | null,
): { text: string; isCustom: boolean } | null {
  const custom = getCustomPurpose(purpose);
  if (custom) return { text: custom, isCustom: true };
  const fallback = cleanProductText(description);
  return fallback ? { text: fallback, isCustom: false } : null;
}

/** Heading above the purpose, worded for the product type. */
export function getPurposeHeading(type?: ProductType | string | null): string {
  if (type === 'PACKAGE') return 'What this package is for';
  if (type === 'PROFILE') return 'What this profile is for';
  return 'What this test is for';
}

export function typeLabel(type?: ProductType | string | null): string {
  if (type === 'PACKAGE') return 'Package';
  if (type === 'PROFILE') return 'Profile';
  return 'Test';
}

export function formatPrice(rupees: number): string {
  return formatRupees(rupees);
}

/** A saving the server already applied, shown as a percentage. Null when there is none. */
export function discountPercent(price: number, mrp?: number | null): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

function fallbackCount(parameters?: string | null): number | null {
  const match = parameters?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/** How many parameters the item covers; a single test counts as one. */
export function parameterCount(product: Pick<CatalogProduct, 'type' | 'parameters' | 'detailsSummary'>): number | null {
  const counted = product.detailsSummary?.testCount || fallbackCount(product.parameters);
  if (counted) return counted;
  return product.type === 'TEST' || product.type === 'PARAMETER' ? 1 : null;
}

export function parameterCountLabel(count: number | null): string {
  if (!count) return 'Parameters vary';
  return count === 1 ? '1 parameter' : `${count} parameters`;
}

export function fastingLabel(fasting?: string | null): string {
  const clean = cleanProductText(fasting);
  if (!clean) return 'Fasting not specified';
  return /fasting/i.test(clean) ? clean : `Fasting: ${clean}`;
}

export function reportLabel(reportTime?: string | null): string {
  const clean = cleanProductText(reportTime);
  return clean ? `Reports in ${clean}` : 'Report time varies';
}

function joinFasting(fasting?: string | null, fastingTime?: string | null): string | null {
  const parts = [cleanProductText(fasting), cleanProductText(fastingTime)].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/**
 * One set of facts for the detail screen. The live partner reply wins, then the server's cached
 * copy, then the catalog row, so a screen never shows two different report times.
 */
export function mergeProductFacts(product: ProductDetail, live?: ProductDetail['detailsData'] | null): ProductFacts {
  const cached = product.detailsData ?? null;
  const summary = product.detailsSummary ?? null;
  const constituents = (live?.constituents?.length ? live.constituents : cached?.constituents) ?? [];
  const named = constituents.length
    ? constituents
    : (summary?.constituentsPreview ?? []).map((name, i) => ({ id: `preview-${i}`, name }));
  const total = parameterCount(product) ?? named.length;

  return {
    sampleType: cleanProductText(product.sampleType),
    fasting: joinFasting(live?.fasting, live?.fastingTime) ?? joinFasting(cached?.fasting, cached?.fastingTime) ?? summary?.fastingLabel ?? null,
    reportTime:
      cleanProductText(live?.reportingTime) ??
      cleanProductText(cached?.reportingTime) ??
      cleanProductText(summary?.reportingTime) ??
      cleanProductText(product.reportTime),
    idealFor: (live?.gender?.length ? live.gender.join(', ') : cached?.gender?.length ? cached.gender.join(', ') : summary?.idealFor) ?? null,
    description: cleanProductText(live?.description) ?? cleanProductText(cached?.description) ?? cleanProductText(product.description),
    constituents: named,
    unnamedConstituents: Math.max(total - named.length, 0),
  };
}
