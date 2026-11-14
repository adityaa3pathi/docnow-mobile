/** Wallet rows. The server decides every amount; these helpers only choose the wording. */
import { formatRupees } from '@/lib/consult/format';
import { formatIstTime } from '@/lib/consult/time';
import { formatIstDate } from '@/lib/lab/bookings';

import type { WalletEntry } from './types';

export const WALLET_NOTE = 'Use your wallet balance during checkout';
export const WALLET_EMPTY_TITLE = 'No transactions yet';
export const WALLET_EMPTY_BODY = 'Your wallet transactions will appear here';

export interface WalletEntryView {
    title: string;
    /** True for money coming in, which the server sends as a positive amount. */
    credit: boolean;
    amount: string;
    meta: string;
    balance: string;
}

/** "REFERRAL" and "PAY_ON_COLLECTION" read as words in the row, as they do on the website. */
export function referenceLabel(referenceType?: string | null): string {
    return (referenceType ?? '').trim().replace(/_/g, ' ');
}

export function walletStamp(iso: string): string {
    const at = Date.parse(iso);
    if (Number.isNaN(at)) return iso;
    return `${formatIstDate(iso)}, ${formatIstTime(iso)}`;
}

export function walletEntryView(entry: WalletEntry): WalletEntryView {
    const credit = entry.amount > 0;
    const reference = referenceLabel(entry.referenceType);
    return {
        title: entry.description,
        credit,
        amount: `${credit ? '+' : '-'}${formatRupees(Math.abs(entry.amount))}`,
        meta: [walletStamp(entry.createdAt), reference].filter(Boolean).join(' · '),
        balance: `Balance ${formatRupees(entry.balanceAfter)}`,
    };
}

export function walletBalanceText(balance: number): string {
    return formatRupees(balance);
}
