/** One typed call per consultation route, so screens never write raw URLs. */
import { isAxiosError } from 'axios';

import { api, errorMessage } from '@/lib/api';
import type {
    BookingView, CancelPreview, CancelResult, CreateBookingResponse, DoctorPublicProfile, DoctorSummary,
    Slot, Specialty, VerifyResponse,
} from './types';

export interface Person {
    id: string;
    name: string;
    relation: string;
    age: number;
    gender: string;
}

/** The server's own message when there is one, otherwise a plain fallback. */
export function friendlyError(e: unknown, fallback?: string): string {
    if (isAxiosError(e) && !e.response) return 'We could not reach the server. Check your connection and try again.';
    return errorMessage(e, fallback);
}

export function errorStatus(e: unknown): number | undefined {
    return isAxiosError(e) ? e.response?.status : undefined;
}

export function errorText(e: unknown): string | undefined {
    return isAxiosError(e) ? (e.response?.data as { error?: string } | undefined)?.error : undefined;
}

const get = <T>(url: string, config?: object) => api.get<T>(url, config).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data);

export const consult = {
    specialties: () => get<Specialty[]>('/api/consult/specialties'),
    doctors: (specialtyId?: string) => get<DoctorSummary[]>('/api/consult/doctors', { params: specialtyId ? { specialtyId } : undefined }),
    doctor: (id: string) => get<DoctorPublicProfile>(`/api/consult/doctors/${id}`),
    slots: (doctorId: string) => get<Slot[]>(`/api/consult/doctors/${doctorId}/slots`),
    createBooking: (body: { slotId: string; patientId: string; idempotencyKey: string }) =>
        post<CreateBookingResponse>('/api/consult/bookings', body),
    bookings: () => get<BookingView[]>('/api/consult/bookings'),
    booking: (id: string) => get<BookingView>(`/api/consult/bookings/${id}`, { timeout: 10_000 }),
    verify: (id: string, body: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        post<VerifyResponse>(`/api/consult/bookings/${id}/verify`, body),
    cancelPreview: (id: string) => get<CancelPreview>(`/api/consult/bookings/${id}/cancel-preview`),
    cancel: (id: string, reason?: string) => post<CancelResult>(`/api/consult/bookings/${id}/cancel`, { reason }),
};

export const people = {
    list: () => get<Person[]>('/api/profile/patients'),
    ensureSelf: () => post<Person>('/api/profile/patients/ensure-self'),
    add: (body: { name: string; relation: string; age: number; gender: string }) =>
        post<{ patient: Person }>('/api/profile/patients', body).then((r) => r.patient),
};
