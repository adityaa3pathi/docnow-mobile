/** One typed call per camp route, so screens never write raw URLs or send an amount. */
import { isAxiosError } from 'axios';

import { api } from '@/lib/api';

import { parseCampDetail, parseCampList } from './camps';
import type { ActiveCamp, CampCheckoutErrorBody, CampCheckoutReply, CampDetail } from './types';

export const camps = {
    /** Active camps whose end date has not passed, soonest first. No sign-in needed. */
    active: (): Promise<ActiveCamp[]> => api.get<unknown>('/api/camps/active').then((r) => parseCampList(r.data)),
    detail: (id: string): Promise<CampDetail | null> =>
        api.get<unknown>(`/api/camps/${id}`).then((r) => parseCampDetail(r.data)),
    /** Rate limited to one call every five seconds, so the key matters on a retry. */
    checkout: (body: object, idempotencyKey: string) =>
        api
            .post<CampCheckoutReply>('/api/camps/checkout', body, {
                headers: { 'x-idempotency-key': idempotencyKey },
                timeout: 30_000,
            })
            .then((r) => r.data),
};

/** The checkout route's own reply body, which carries the code that says what went wrong. */
export function campErrorBody(error: unknown): CampCheckoutErrorBody | undefined {
    return isAxiosError(error) ? (error.response?.data as CampCheckoutErrorBody | undefined) : undefined;
}
