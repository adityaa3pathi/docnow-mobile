/** Shapes the profile and referral routes send back. Every amount here is the server's own number. */

export interface AccountProfile {
    id: string;
    name: string | null;
    email: string | null;
    mobile: string;
    isVerified: boolean;
    gender?: string | null;
    age?: number | null;
    wallet?: { balance: number } | null;
}

export interface ProfileUpdate {
    name?: string;
    gender?: string;
    age?: number;
    email?: string;
}

export interface WalletEntry {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    /** Signed: a credit is positive, a spend is negative. */
    amount: number;
    balanceAfter: number;
    description: string;
    referenceType?: string | null;
    createdAt: string;
}

export interface WalletView {
    balance: number;
    transactions: WalletEntry[];
}

export interface ReferralFriend {
    id: string;
    name: string | null;
    mobile: string;
    joinedAt: string;
    status: 'SIGNED_UP' | 'ORDER_COMPLETED';
}

export interface ReferralReward {
    id: string;
    rewardType: 'REFEREE_SIGNUP' | 'REFERRER_ORDER';
    amount: number;
    processedAt: string | null;
    createdAt: string;
    status: string;
    refereeName: string | null;
    refereeMobile: string | null;
    isBeneficiaryReferee: boolean;
}

export interface ReferralCentre {
    referralCode: string;
    shareLink: string;
    /** Set by the server's system config, so the app never invents a bonus amount. */
    rewardsConfig: { refereeBonus: number; referrerBonus: number };
    stats: { totalReferrals: number; totalEarnings: number };
    referrals: ReferralFriend[];
    rewardHistory: ReferralReward[];
}
