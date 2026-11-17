// Every amount here is already decided by the server; these helpers only choose the wording.
import { formatRupees } from '@/lib/consult/format';
import type { CheckoutOutcome } from './types';

export const PAY_ON_COLLECTION = 'PAY_ON_COLLECTION';

export interface MoneyInput {
    /** What the tests cost before any discount. Lab amounts are whole rupees, not paise. */
    totalAmount: number;
    discountAmount?: number | null;
    walletAmount?: number | null;
    /** What was charged, or what the collector will take. The server sends it only where it knows. */
    finalAmount?: number | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    /** From the payment-status route: still to be taken at collection, else 0. */
    amountDue?: number | null;
    outcome?: CheckoutOutcome | null;
}

export interface MoneyLine {
    label: string;
    value: string;
    /** True for the line a reader should land on, such as the amount still due. */
    strong?: boolean;
}

const positive = (value?: number | null) => (typeof value === 'number' && value > 0 ? value : 0);

export function payOnCollection(input: MoneyInput): boolean {
    return input.paymentMethod === PAY_ON_COLLECTION;
}

/** True while the collector still has to take the money at the home visit. */
export function dueAtCollection(input: MoneyInput): number {
    return payOnCollection(input) ? positive(input.amountDue) : 0;
}

/** The one sentence a card or a details header shows about the money. */
export function paymentLine(input: MoneyInput): string {
    const due = dueAtCollection(input);
    if (due > 0) return `Pay ${formatRupees(due)} at sample collection`;
    if (payOnCollection(input)) return 'Paid at sample collection';

    const status = input.paymentStatus ?? '';
    const outcome = input.outcome ?? null;
    if (status === 'REFUNDED' || outcome === 'refunded') return 'Refunded';
    if (status === 'CONFIRMED' || outcome === 'confirmed') return 'Paid online';
    if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(status) || outcome === 'not_paid') return 'Not paid';
    return 'Payment is being confirmed';
}

/** A short "₹899 · Paid online" for a list row. */
export function amountSummary(input: MoneyInput): string {
    return `${formatRupees(input.totalAmount)} · ${paymentLine(input)}`;
}

/**
 * The breakdown for the details screen. Lines the server has not sent are left out rather than
 * shown as zero, so the app never implies a discount or a wallet credit it cannot see.
 */
export function moneyLines(input: MoneyInput): MoneyLine[] {
    const lines: MoneyLine[] = [{ label: 'Tests total', value: formatRupees(input.totalAmount) }];

    const discount = positive(input.discountAmount);
    if (discount > 0) lines.push({ label: 'Discount', value: `-${formatRupees(discount)}` });

    const wallet = positive(input.walletAmount);
    if (wallet > 0) lines.push({ label: 'Wallet used', value: `-${formatRupees(wallet)}` });

    const due = dueAtCollection(input);
    if (due > 0) {
        lines.push({ label: 'Pay at sample collection', value: formatRupees(due), strong: true });
        return lines;
    }

    const paid = positive(input.finalAmount) || input.totalAmount;
    const closing: MoneyLine = { label: closingLabel(input), value: formatRupees(paid), strong: true };
    // Nothing came off the total, so one line says it all instead of repeating the same amount.
    if (lines.length === 1 && paid === input.totalAmount) return [closing];
    lines.push(closing);
    return lines;
}

/** The label on the closing money line, which reads as an amount rather than as a sentence. */
function closingLabel(input: MoneyInput): string {
    if (payOnCollection(input)) return 'Paid at sample collection';
    const line = paymentLine(input);
    return line === 'Payment is being confirmed' ? 'Amount being confirmed' : line;
}
