/** One typed call per checkout route, so screens never write raw URLs or send an amount. */
import { isAxiosError } from 'axios';

import { api } from '@/lib/api';
import { parseSlots } from '@/lib/lab/slots';
import type { LabSlot } from '@/lib/lab/types';

import type { InitiateErrorBody } from './checkout';
import type {
    AddressInput,
    AppliedPromo,
    AvailablePromo,
    InitiateReply,
    SavedAddress,
    ValidateReply,
    VerifyReply,
} from './types';

const get = <T>(url: string, config?: object) => api.get<T>(url, config).then((r) => r.data);
const post = <T>(url: string, body?: unknown, config?: object) => api.post<T>(url, body, config).then((r) => r.data);
const put = <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data);

export interface SlotQuery {
    lat: string;
    long: string;
    zipcode: string;
    date: string;
}

export const addresses = {
    list: () => get<SavedAddress[]>('/api/profile/addresses'),
    add: (body: AddressInput) =>
        post<{ address: SavedAddress }>('/api/profile/addresses', body).then((r) => r.address),
    /** The server soft-deletes the old row and returns a new one, so the id changes. */
    update: (id: string, body: AddressInput) =>
        put<{ address: SavedAddress }>(`/api/profile/addresses/${id}`, body).then((r) => r.address),
    saveCoords: (id: string, lat: string, long: string) =>
        api.patch(`/api/profile/addresses/${id}/coords`, { lat, long }).then(() => undefined),
    /** Refused while it is the only saved address, so the screen shows the server's reason. */
    remove: (id: string) => api.delete(`/api/profile/addresses/${id}`).then(() => undefined),
};

export const location = {
    serviceability: (lat: string, long: string, zipcode: string) =>
        get<{ data?: { zone_id?: string | number | null } | null }>('/api/location/serviceability', {
            params: { lat, long, zipcode },
            timeout: 20_000,
        }),
    geocodePincode: (pincode: string) =>
        get<{ lat?: string; long?: string; city?: string }>('/api/location/geocode', { params: { pincode } }),
};

export const checkoutSlots = {
    /** Calls the lab partner through our server, so it is slower than the rest. */
    list: (query: SlotQuery): Promise<LabSlot[]> =>
        get<unknown>('/api/slots', { params: query, timeout: 25_000 }).then(parseSlots),
    freeze: (slotId: string) => post<unknown>('/api/slots/freeze', { slot_id: slotId }, { timeout: 25_000 }),
};

export const offers = {
    wallet: () => get<{ balance?: number }>('/api/profile/wallet').then((r) => r.balance ?? 0),
    available: () => get<AvailablePromo[]>('/api/promos/available'),
    /** The cart amount is only what the server checks the minimum order value against. */
    validate: (code: string, cartAmount: number) => post<AppliedPromo>('/api/promos/validate', { code, cartAmount }),
};

export const payments = {
    options: () => get<{ payOnCollection?: boolean }>('/api/payments/options'),
    /** A location check before paying; a failure here warns but never blocks, as on the website. */
    validateCart: (body: { cartId: string; zipcode: string; lat?: string | null; long?: string | null; date: string }) =>
        post<ValidateReply>('/api/payments/validate', body, { timeout: 25_000 }),
    initiate: (body: object, idempotencyKey: string) =>
        post<InitiateReply>('/api/payments/initiate', body, {
            headers: { 'x-idempotency-key': idempotencyKey },
            timeout: 30_000,
        }),
    verify: (body: {
        bookingId: string;
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => post<VerifyReply>('/api/payments/verify', body, { timeout: 30_000 }),
};

/** The initiate route's own reply body, which carries the code that says what went wrong. */
export function initiateErrorBody(error: unknown): InitiateErrorBody | undefined {
    return isAxiosError(error) ? (error.response?.data as InitiateErrorBody | undefined) : undefined;
}

export const profile = {
    /** Only gender and age reach the user record; the server ignores anything else sent here. */
    update: (body: { name?: string; gender?: string; age?: number }) => put<unknown>('/api/profile', body),
};
