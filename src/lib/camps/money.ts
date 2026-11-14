/**
 * Display-only camp maths, mirroring the website's camp page: price, then promo, then wallet.
 * The server prices the registration again at checkout, so nothing here is ever sent to it.
 */
import type { SummaryLine } from '@/lib/checkout';
import { formatRupees } from '@/lib/consult/format';

export interface CampTotalsInput {
    price: number;
    /** What the server said this promo takes off, or 0 when none is applied. */
    discountAmount?: number;
    walletBalance?: number;
    useWallet?: boolean;
}

export interface CampTotals {
    price: number;
    discountAmount: number;
    walletDeduction: number;
    finalPayable: number;
}

export function campTotals(input: CampTotalsInput): CampTotals {
    const price = Math.max(0, input.price);
    const discountAmount = Math.max(0, Math.min(input.discountAmount ?? 0, price));
    const afterDiscount = Math.max(0, price - discountAmount);
    const walletDeduction = input.useWallet ? Math.min(Math.max(0, input.walletBalance ?? 0), afterDiscount) : 0;
    return { price, discountAmount, walletDeduction, finalPayable: Math.max(0, afterDiscount - walletDeduction) };
}

/** The summary rows, leaving out a discount or wallet line the registration does not have. */
export function campSummaryLines(totals: CampTotals): SummaryLine[] {
    const lines: SummaryLine[] = [
        { key: 'price', label: 'Base Price', value: formatRupees(totals.price), tone: 'plain' },
    ];
    if (totals.discountAmount > 0) {
        lines.push({ key: 'discount', label: 'Promo Discount', value: `-${formatRupees(totals.discountAmount)}`, tone: 'discount' });
    }
    if (totals.walletDeduction > 0) {
        lines.push({ key: 'wallet', label: 'Wallet', value: `-${formatRupees(totals.walletDeduction)}`, tone: 'wallet' });
    }
    return lines;
}

/** The pay button's words, the same two the website uses. */
export function campPayCta(finalPayable: number): string {
    return finalPayable === 0 ? 'Register for Free' : `Pay & Register ${formatRupees(finalPayable)}`;
}
