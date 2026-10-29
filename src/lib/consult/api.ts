/** One typed call per consultation route, so screens never write raw URLs. */
import { isAxiosError } from 'axios';

import { api, errorMessage } from '@/lib/api';
import type {
    AvailabilityWindow, BookingView, CancelPreview, CancelResult, CartAddResult, ConsultNote, ConsultationStatus,
    ConsultAttachment, CreateBookingInput, CreateBookingResponse, DoctorConsultationPage, GuestInfo, DoctorConsultationRecord, DoctorMe, DoctorProfileInput,
    DoctorPublicProfile, DoctorSummary, JoinResponse, LeaveEntry, NoteInput, Prescription, PrescriptionInput, ReassignOption,
    Slot, Specialty, VerifyResponse,
} from './types';

export interface Person {
    id: string;
    name: string;
    relation: string;
    age: number;
    gender: string;
    // Family intake (older servers leave these out).
    /** The family member's own 10-digit mobile: they see the booking when they sign in with it. */
    phone?: string | null;
    preferredLanguage?: 'hi' | 'en';
    bloodGroup?: string | null;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    /** Set once the family member accepted bookings on their own phone. */
    linkedAt?: string | null;
    /** Set when the owner of `phone` said "this is not me". */
    linkDeclinedAt?: string | null;
}

export type PersonIntake = Pick<Person, 'phone' | 'preferredLanguage' | 'bloodGroup' | 'allergies' | 'chronicConditions' | 'currentMedications'>;

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
    createBooking: (body: CreateBookingInput) => post<CreateBookingResponse>('/api/consult/bookings', body),
    bookings: () => get<BookingView[]>('/api/consult/bookings'),
    booking: (id: string) => get<BookingView>(`/api/consult/bookings/${id}`, { timeout: 10_000 }),
    verify: (id: string, body: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        post<VerifyResponse>(`/api/consult/bookings/${id}/verify`, body),
    cancelPreview: (id: string) => get<CancelPreview>(`/api/consult/bookings/${id}/cancel-preview`),
    cancel: (id: string, reason?: string) => post<CancelResult>(`/api/consult/bookings/${id}/cancel`, { reason }),
    join: (id: string) => post<JoinResponse>(`/api/consult/bookings/${id}/join`),
    prescription: (id: string) => get<Prescription>(`/api/consult/bookings/${id}/prescription`),
    prescriptionPdfUrl: (id: string) => `${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/consult/bookings/${id}/prescription.pdf`,
    /** A signed link that opens the PDF without sign-in headers (in-app browser, sharing). */
    prescriptionLink: (id: string) =>
        get<{ token: string; expiresInHours: number }>(`/api/consult/bookings/${id}/prescription/link`).then(
            (r) => `${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/consult/prescriptions/public/${r.token}`,
        ),
    // Family member: "booked for you by …" — accept once per person, or say it is not them.
    acceptFamily: (patientId: string) => post<{ patientId: string; linked: boolean }>(`/api/consult/family/${patientId}/accept`),
    declineFamily: (patientId: string) => post<{ patientId: string; linked: boolean }>(`/api/consult/family/${patientId}/decline`),
    // Zero-login join (docnow.in/call/<token>): works signed in or not.
    guestInfo: (token: string) => get<GuestInfo>(`/api/consult/guest/${encodeURIComponent(token)}`),
    guestJoin: (token: string) => post<JoinResponse>(`/api/consult/guest/${encodeURIComponent(token)}/join`),
    /** Uploads one photo / PDF of an outside record; book with its id in `attachmentIds`. */
    uploadAttachment: (file: { uri: string; name: string; mimeType: string }) => {
        const form = new FormData();
        // React Native's FormData takes a file as { uri, name, type }.
        form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        return api
            .post<ConsultAttachment>('/api/consult/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })
            .then((r) => r.data);
    },
    removeAttachment: (id: string) => api.delete(`/api/consult/attachments/${id}`).then((r) => r.data),
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
    /** Saves the family intake (phone, language, health snapshot). */
    updateIntake: (id: string, body: PersonIntake) =>
        api.patch<{ patient: Person }>(`/api/profile/patients/${id}`, body).then((r) => r.data.patient),
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
