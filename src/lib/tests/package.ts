import type { CatalogItem } from './types';

export interface PackageFacts {
  price: number;
  /** The struck-through price, only when there is a real discount. */
  mrp: number | null;
  offPercent: number | null;
  parametersCount: number | null;
  fasting: 'required' | 'not-required' | null;
  reportTime: string | null;
}

/** What a package card shows, read only from catalog data (nothing is shown when a field is missing). */
export function packageFacts(item: Pick<CatalogItem, 'displayPrice' | 'discountedPrice' | 'parameters' | 'reportTime' | 'detailsData'>): PackageFacts {
  const price = item.discountedPrice ?? item.displayPrice;
  const discounted = item.discountedPrice !== null && item.discountedPrice < item.displayPrice && item.displayPrice > 0;
  const off = discounted ? Math.floor(((item.displayPrice - price) / item.displayPrice) * 100) : 0;

  const counted = item.detailsData?.parametersCount ?? item.detailsData?.parametersList?.length;
  const parsed = item.parameters ? Number.parseInt(item.parameters.replace(/[^\d]/g, ''), 10) : NaN;
  const parametersCount = counted && counted > 0 ? counted : Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  const advice = item.detailsData?.fastingAdvice?.trim().toLowerCase() ?? '';
  const fasting = !advice ? null : /\b(no|not|non)[\s-]*(fasting|required|needed)|not required|without fasting/.test(advice) ? 'not-required' : /fast/.test(advice) ? 'required' : null;

  return {
    price,
    mrp: discounted ? item.displayPrice : null,
    // A 0% "discount" (e.g. ₹999 vs ₹1,000) is not worth a badge.
    offPercent: off >= 1 ? off : null,
    parametersCount,
    fasting,
    reportTime: item.reportTime ?? item.detailsData?.reportTime ?? null,
  };
}
