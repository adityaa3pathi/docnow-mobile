/** One typed call per consultation route, so screens never write raw URLs. */
import { isAxiosError } from 'axios';

import { api, errorMessage } from '@/lib/api';
import type {
    AvailabilityWindow, BookingView, CancelPreview, CancelResult, CartAddResult, ConsultNote, ConsultationStatus,
    CreateBookingResponse, DoctorConsultationPage, DoctorConsultationRecord, DoctorMe, DoctorProfileInput,
    DoctorPublicProfile, DoctorSummary, JoinResponse, LeaveEntry, NoteInput, Prescription, PrescriptionInput, ReassignOption,
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
const put = <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data);
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
    join: (id: string) => post<JoinResponse>(`/api/consult/bookings/${id}/join`),
    prescription: (id: string) => get<Prescription>(`/api/consult/bookings/${id}/prescription`),
    prescriptionPdfUrl: (id: string) => `${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/consult/bookings/${id}/prescription.pdf`,
    addTestsToCart: (id: string) => post<CartAddResult>(`/api/consult/bookings/${id}/recommended-tests/cart`),
    // Doctor running late: each answers 409 until the server sees the doctor 5+ minutes late.
    rescheduleSlots: (id: string) => get<Slot[]>(`/api/consult/bookings/${id}/reschedule-slots`),
    reschedule: (id: string, newSlotId: string) => post<BookingView>(`/api/consult/bookings/${id}/reschedule`, { newSlotId }),
    reassignOption: (id: string) =>
        get<{ option: ReassignOption | null }>(`/api/consult/bookings/${id}/reassign-option`).then((r) => r.option),
    reassign: (id: string, slotId: string) => post<BookingView>(`/api/consult/bookings/${id}/reassign`, { slotId }),
};

export const people = {
    list: () => get<Person[]>('/api/profile/patients'),
    ensureSelf: () => post<Person>('/api/profile/patients/ensure-self'),
    add: (body: { name: string; relation: string; age: number; gender: string }) =>
        post<{ patient: Person }>('/api/profile/patients', body).then((r) => r.patient),
};

export const doctor = {
    me: () => get<DoctorMe>('/api/doctor/me'),
    register: (body: DoctorProfileInput) => post<DoctorMe>('/api/doctor/register', body),
    resubmit: (body: DoctorProfileInput) => post<DoctorMe>('/api/doctor/resubmit', body),
    setAvailability: (windows: AvailabilityWindow[], slotMinutes?: number) =>
        put<AvailabilityWindow[]>('/api/doctor/me/availability', { windows, slotMinutes }),
    leave: () => get<LeaveEntry[]>('/api/doctor/me/leave'),
    addLeave: (body: { startsAt: string; endsAt: string; reason?: string }) =>
        post<{ leave: LeaveEntry; bookedConflicts: number }>('/api/doctor/me/leave', body),
    removeLeave: (id: string) => api.delete(`/api/doctor/me/leave/${id}`).then((r) => r.data),
    consultations: (scope: 'upcoming' | 'past', cursor?: string | null) =>
        get<DoctorConsultationPage>('/api/doctor/me/consultations', { params: { scope, limit: 30, ...(cursor ? { cursor } : {}) } }),
    consultation: (id: string) => get<DoctorConsultationRecord>(`/api/doctor/me/consultations/${id}`, { timeout: 10_000 }),
    join: (id: string) => post<JoinResponse>(`/api/doctor/me/consultations/${id}/join`),
    /** Moves IN_PROGRESS to COMPLETED and closes the video room for everyone. */
    end: (id: string) => post<{ status: ConsultationStatus }>(`/api/doctor/me/consultations/${id}/end`),
    /** Notes lock once a prescription is issued (409). */
    saveNotes: (id: string, body: NoteInput) => put<ConsultNote>(`/api/doctor/me/consultations/${id}/notes`, body),
    issuePrescription: (id: string, body: PrescriptionInput) =>
        post<Prescription>(`/api/doctor/me/consultations/${id}/prescription`, body),
};
