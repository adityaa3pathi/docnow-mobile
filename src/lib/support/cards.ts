// Ported from docnowtesting/client/src/hooks/useSupportChat.ts and ChatProductCards.tsx, so the
// app keeps the same cards the website shows. Prices come from the server; nothing here edits them.
import { productSlug } from '@/lib/shop/slug';

import type { ChatProductCard } from './types';

/** Drops anything missing a code, name or numeric price, because a card without those cannot be tapped. */
export function toProductCards(raw: unknown): ChatProductCard[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .filter((c) => c && typeof c.code === 'string' && typeof c.name === 'string' && typeof c.price === 'number')
    .map((c) => ({
      code: c.code as string,
      name: c.name as string,
      type: typeof c.type === 'string' ? c.type : 'TEST',
      price: c.price as number,
      mrp: typeof c.mrp === 'number' ? c.mrp : null,
      sampleType: typeof c.sample_type === 'string' ? c.sample_type : null,
      reportTime: typeof c.report_time === 'string' ? c.report_time : null,
    }));
}

/** The app has one product route, so the website's tests/profiles/packages split collapses to the slug. */
export function cardProductPath(card: Pick<ChatProductCard, 'name' | 'code'>): string {
  return `/shop/product/${productSlug(card.name, card.code)}`;
}

/** The short facts line under a card name; empty when the server sent neither fact. */
export function cardFacts(card: ChatProductCard): string[] {
  const facts: string[] = [];
  if (card.sampleType) facts.push(card.sampleType);
  if (card.reportTime) facts.push(`Report ${card.reportTime}`);
  return facts;
}
