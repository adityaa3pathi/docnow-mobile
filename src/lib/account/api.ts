/** One typed call per profile route, so screens never write raw URLs. */
import { api } from '@/lib/api';

import type { AccountProfile, ProfileUpdate, ReferralCentre, WalletView } from './types';

const get = <T>(url: string) => api.get<T>(url).then((r) => r.data);
const put = <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data);

export const account = {
    profile: () => get<AccountProfile>('/api/profile'),
    updateProfile: (body: ProfileUpdate) =>
        put<{ user: AccountProfile }>('/api/profile', body).then((r) => r.user),
    changePassword: (currentPassword: string, newPassword: string) =>
        put<{ message?: string }>('/api/profile/password', { currentPassword, newPassword }).then(() => undefined),
    wallet: () => get<WalletView>('/api/profile/wallet'),
    referrals: () => get<ReferralCentre>('/api/profile/referrals'),
};
