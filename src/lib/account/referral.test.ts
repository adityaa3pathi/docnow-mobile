import { describe, expect, it } from 'vitest';

import {
    friendView,
    referralShareMessage,
    referralStatsText,
    referralSteps,
    referralSummary,
    rewardView,
} from './referral';
import type { ReferralReward } from './types';

const rewards = { refereeBonus: 50, referrerBonus: 100 };

describe('referralSummary', () => {
    it('states both bonuses exactly as the server set them', () => {
        expect(referralSummary(rewards)).toBe(
            'Your friend gets ₹50 at signup, and you get ₹100 after their first confirmed order.',
        );
    });

    it('follows the server when the config changes', () => {
        expect(referralSummary({ refereeBonus: 75, referrerBonus: 250 })).toBe(
            'Your friend gets ₹75 at signup, and you get ₹250 after their first confirmed order.',
        );
    });
});

describe('referralSteps', () => {
    it('spells out the three steps with the server amounts', () => {
        expect(referralSteps(rewards)).toEqual([
            { title: '1. Share your code', body: 'Invite friends with your personal code or link.' },
            {
                title: '2. Friend signs up',
                body: 'They get ₹50 once they create their account with your code.',
            },
            {
                title: '3. First order confirmed',
                body: 'You get ₹100 after their first confirmed booking.',
            },
        ]);
    });
});

describe('referralShareMessage', () => {
    it('matches the website share text', () => {
        expect(referralShareMessage('ASHA12', 'https://docnow.in/?ref=ASHA12')).toBe(
            'Join DocNow with my referral code ASHA12. Sign up here: https://docnow.in/?ref=ASHA12',
        );
    });
});

describe('friendView', () => {
    const friend = {
        id: 'f1',
        name: 'Ravi',
        mobile: '9876543210',
        joinedAt: '2026-11-14T08:40:00.000Z',
        status: 'SIGNED_UP' as const,
    };

    it('shows the joining date and the signed-up state', () => {
        expect(friendView(friend)).toEqual({
            name: 'Ravi',
            joined: 'Joined 14 Nov 2026',
            status: 'Signed up',
            completed: false,
        });
    });

    it('falls back to the mobile number and marks a completed first order', () => {
        const done = friendView({ ...friend, name: null, status: 'ORDER_COMPLETED' });
        expect(done.name).toBe('9876543210');
        expect(done.status).toBe('First order completed');
        expect(done.completed).toBe(true);
    });
});

describe('rewardView', () => {
    const reward: ReferralReward = {
        id: 'r1',
        rewardType: 'REFERRER_ORDER',
        amount: 100,
        processedAt: '2026-11-14T08:40:00.000Z',
        createdAt: '2026-11-10T08:40:00.000Z',
        status: 'PROCESSED',
        refereeName: 'Ravi',
        refereeMobile: '9876543210',
        isBeneficiaryReferee: false,
    };

    it('names the friend and uses the processed date', () => {
        expect(rewardView(reward)).toEqual({
            title: 'Referral reward for Ravi',
            when: '14 Nov 2026',
            amount: '+₹100',
        });
    });

    it('falls back to the created date when nothing was processed yet', () => {
        expect(rewardView({ ...reward, processedAt: null }).when).toBe('10 Nov 2026');
    });

    it('calls the signup credit a welcome bonus', () => {
        const welcome = rewardView({ ...reward, rewardType: 'REFEREE_SIGNUP', isBeneficiaryReferee: true, amount: 50 });
        expect(welcome.title).toBe('Welcome referral bonus');
        expect(welcome.amount).toBe('+₹50');
    });

    it('says your friend when no name or number came back', () => {
        expect(rewardView({ ...reward, refereeName: null, refereeMobile: null }).title).toBe(
            'Referral reward for your friend',
        );
    });
});

describe('referralStatsText', () => {
    it('reads the counts the server totalled', () => {
        expect(referralStatsText({ totalReferrals: 3, totalEarnings: 300 })).toEqual({
            referrals: '3',
            referralsNote: 'Friends who joined using your referral code.',
            earnings: '₹300',
            earningsNote: 'Total referral rewards credited to you so far.',
        });
    });
});
