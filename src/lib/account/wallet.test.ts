import { describe, expect, it } from 'vitest';

import type { WalletEntry } from './types';
import { referenceLabel, walletBalanceText, walletEntryView, walletStamp } from './wallet';

const credit: WalletEntry = {
    id: 'w1',
    type: 'CREDIT',
    amount: 100,
    balanceAfter: 150,
    description: 'Referral reward',
    referenceType: 'REFERRAL',
    createdAt: '2026-11-14T08:40:00.000Z',
};

describe('referenceLabel', () => {
    it('reads an underscored code as words', () => {
        expect(referenceLabel('PAY_ON_COLLECTION')).toBe('PAY ON COLLECTION');
        expect(referenceLabel(null)).toBe('');
        expect(referenceLabel(undefined)).toBe('');
    });
});

describe('walletStamp', () => {
    it('shows the Indian date and time of the entry', () => {
        expect(walletStamp('2026-11-14T08:40:00.000Z')).toBe('14 Nov 2026, 2:10 PM');
    });

    it('hands back anything it cannot read as a date', () => {
        expect(walletStamp('not a date')).toBe('not a date');
    });
});

describe('walletEntryView', () => {
    it('shows money coming in with a plus', () => {
        expect(walletEntryView(credit)).toEqual({
            title: 'Referral reward',
            credit: true,
            amount: '+₹100',
            meta: '14 Nov 2026, 2:10 PM · REFERRAL',
            balance: 'Balance ₹150',
        });
    });

    it('shows money spent with a minus and no sign on the balance', () => {
        const spent = walletEntryView({
            ...credit,
            type: 'DEBIT',
            amount: -249.5,
            balanceAfter: 0,
            description: 'Used on booking',
            referenceType: 'ORDER',
        });
        expect(spent.credit).toBe(false);
        expect(spent.amount).toBe('-₹249.5');
        expect(spent.balance).toBe('Balance ₹0');
    });

    it('leaves the reference out of the line when the server did not send one', () => {
        expect(walletEntryView({ ...credit, referenceType: null }).meta).toBe('14 Nov 2026, 2:10 PM');
    });
});

describe('walletBalanceText', () => {
    it('groups the amount the Indian way', () => {
        expect(walletBalanceText(0)).toBe('₹0');
        expect(walletBalanceText(125000)).toBe('₹1,25,000');
    });
});
