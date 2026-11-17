/**
 * Refer-and-earn wording. Both bonus amounts come from the server's referral config, so the app
 * never states a reward of its own; the sentences match the website's referral page.
 */
import { formatRupees } from '@/lib/consult/format';
import { formatIstDate } from '@/lib/lab/bookings';

import type { ReferralCentre, ReferralFriend, ReferralReward } from './types';

type Rewards = ReferralCentre['rewardsConfig'];

export const REFERRAL_INTRO = 'Share your code, invite friends, and track the rewards you unlock together.';
export const NO_REFERRALS_TITLE = 'No referrals yet';
export const NO_REFERRALS_BODY = 'Share your code to start earning rewards.';
export const NO_REWARDS_TITLE = 'No rewards yet';
export const NO_REWARDS_BODY = 'Referral credits will appear here once they are processed.';

/** The one sentence under the code, with both amounts as the server set them. */
export function referralSummary(rewards: Rewards): string {
    return `Your friend gets ${formatRupees(rewards.refereeBonus)} at signup, and you get ${formatRupees(
        rewards.referrerBonus,
    )} after their first confirmed order.`;
}

export interface ReferralStep {
    title: string;
    body: string;
}

/** The website's three "how it works" steps, in the same order and with the same amounts. */
export function referralSteps(rewards: Rewards): ReferralStep[] {
    return [
        { title: '1. Share your code', body: 'Invite friends with your personal code or link.' },
        {
            title: '2. Friend signs up',
            body: `They get ${formatRupees(rewards.refereeBonus)} once they create their account with your code.`,
        },
        {
            title: '3. First order confirmed',
            body: `You get ${formatRupees(rewards.referrerBonus)} after their first confirmed booking.`,
        },
    ];
}

/** What goes into the system share sheet, word for word as the website's WhatsApp share. */
export function referralShareMessage(code: string, shareLink: string): string {
    return `Join DocNow with my referral code ${code}. Sign up here: ${shareLink}`;
}

export interface FriendView {
    name: string;
    joined: string;
    status: string;
    completed: boolean;
}

export function friendView(friend: ReferralFriend): FriendView {
    const completed = friend.status === 'ORDER_COMPLETED';
    return {
        name: friend.name?.trim() || friend.mobile,
        joined: `Joined ${formatIstDate(friend.joinedAt)}`,
        status: completed ? 'First order completed' : 'Signed up',
        completed,
    };
}

export interface RewardView {
    title: string;
    when: string;
    amount: string;
}

export function rewardView(reward: ReferralReward): RewardView {
    const friend = reward.refereeName?.trim() || reward.refereeMobile?.trim() || 'your friend';
    const welcome = reward.rewardType === 'REFEREE_SIGNUP' && reward.isBeneficiaryReferee;
    return {
        title: welcome ? 'Welcome referral bonus' : `Referral reward for ${friend}`,
        when: formatIstDate(reward.processedAt ?? reward.createdAt),
        amount: `+${formatRupees(reward.amount)}`,
    };
}

export function referralStatsText(stats: ReferralCentre['stats']) {
    return {
        referrals: String(stats.totalReferrals),
        referralsNote: 'Friends who joined using your referral code.',
        earnings: formatRupees(stats.totalEarnings),
        earningsNote: 'Total referral rewards credited to you so far.',
    };
}
