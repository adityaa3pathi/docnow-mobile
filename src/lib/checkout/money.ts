/**
 * Display-only order maths, mirroring the website's cart page. The server works the real amount
 * out again at checkout, so nothing here is ever sent to it.
 */
import { formatRupees } from '@/lib/consult/format';
import type { CartItem } from '@/lib/cart';

/** Must mirror server/src/utils/collectionFee.ts and the website's lib/collectionFee.ts. */
export const SAMPLE_COLLECTION_FEE = 129;
export const SAMPLE_COLLECTION_FEE_THRESHOLD = 500;

export function getCollectionFee(itemsTotal: number): number {
    return itemsTotal < SAMPLE_COLLECTION_FEE_THRESHOLD ? SAMPLE_COLLECTION_FEE : 0;
}

export function itemsTotal(items: Pick<CartItem, 'price'>[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
}

export interface TotalsInput {
    items: Pick<CartItem, 'price'>[];
    /** What the server said this promo takes off, or 0 when none is applied. */
    discountAmount?: number;
    walletBalance?: number;
    useWallet?: boolean;
}

export interface Totals {
    itemsCount: number;
    itemsTotal: number;
    collectionFee: number;
    discountAmount: number;
    walletDeduction: number;
    finalPayable: number;
}

/** The same order of operations as the website: fee, then promo, then wallet. */
export function orderTotals(input: TotalsInput): Totals {
    const total = itemsTotal(input.items);
    const collectionFee = getCollectionFee(total);
    const discountAmount = Math.max(0, Math.min(input.discountAmount ?? 0, total + collectionFee));
    const payableAfterDiscount = Math.max(0, total + collectionFee - discountAmount);
    const walletDeduction = input.useWallet ? Math.min(Math.max(0, input.walletBalance ?? 0), payableAfterDiscount) : 0;
    return {
        itemsCount: input.items.length,
        itemsTotal: total,
        collectionFee,
        discountAmount,
        walletDeduction,
        finalPayable: Math.max(0, payableAfterDiscount - walletDeduction),
    };
}

export type LineTone = 'plain' | 'free' | 'fee' | 'discount' | 'wallet';

export interface SummaryLine {
    key: string;
    label: string;
    value: string;
    tone: LineTone;
}

/** The summary rows, leaving out a discount or wallet line the order does not have. */
export function summaryLines(totals: Totals): SummaryLine[] {
    const lines: SummaryLine[] = [
        {
            key: 'items',
            label: `Items (${totals.itemsCount})`,
            value: formatRupees(totals.itemsTotal),
            tone: 'plain',
        },
        {
            key: 'collection',
            label: 'Sample collection',
            value: totals.collectionFee > 0 ? formatRupees(totals.collectionFee) : 'Free',
            tone: totals.collectionFee > 0 ? 'fee' : 'free',
        },
    ];
    if (totals.discountAmount > 0) {
        lines.push({ key: 'discount', label: 'Coupon discount', value: `-${formatRupees(totals.discountAmount)}`, tone: 'discount' });
    }
    if (totals.walletDeduction > 0) {
        lines.push({ key: 'wallet', label: 'Wallet used', value: `-${formatRupees(totals.walletDeduction)}`, tone: 'wallet' });
    }
    return lines;
}

/** Shown under the collection row while the fee applies, as on the website. */
export function collectionFeeNote(totals: Totals): string | null {
    return totals.collectionFee > 0 ? `Free collection on orders above ${formatRupees(SAMPLE_COLLECTION_FEE_THRESHOLD)}` : null;
}

/** Healthians takes whole rupees at collection, so the paisa is dropped, never rounded up. */
export function payAtCollectionAmount(finalPayable: number): number {
    return Math.max(0, Math.floor(finalPayable + 1e-9));
}

export interface PayableView {
    label: string;
    amount: string;
    cta: string;
}

/** What the total row and the pay button read, which differs for pay at collection. */
export function payableView(finalPayable: number, payAtCollection: boolean): PayableView {
    if (payAtCollection) {
        const amount = formatRupees(payAtCollectionAmount(finalPayable));
        return { label: 'Pay at collection', amount, cta: 'Place order' };
    }
    const amount = formatRupees(finalPayable);
    return { label: 'Total payable', amount, cta: finalPayable > 0 ? `Pay ${amount}` : 'Place order' };
}
