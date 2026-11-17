/** One typed call per lab booking, report and invoice route, so screens never write raw URLs. */
import { API_URL, api } from '@/lib/api';
import type {
    CancelLabResult,
    LabBooking,
    LabPaymentStatus,
    LabReportDetail,
    LabReportSummary,
    LabSlot,
    LabStatusResponse,
    PhleboContact,
} from './types';
import { parseSlots, rescheduleBody } from './slots';

const get = <T>(url: string, config?: object) => api.get<T>(url, config).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data);

export const lab = {
    bookings: () => get<LabBooking[]>('/api/bookings'),
    /** Calls the lab partner, so it is slower than the rest and rate limited to 10 a minute. */
    status: (id: string) => get<LabStatusResponse>(`/api/bookings/${id}/status`, { timeout: 25_000 }),
    paymentStatus: (id: string) => get<LabPaymentStatus>(`/api/bookings/${id}/payment-status`),
    phlebo: (id: string) => get<PhleboContact>(`/api/bookings/${id}/phlebo-contact`),
    cancel: (id: string, remarks: string) => post<CancelLabResult>(`/api/bookings/${id}/cancel`, { remarks }),
    slots: (id: string, date: string): Promise<LabSlot[]> =>
        get<unknown>(`/api/bookings/${id}/reschedulable-slots`, { params: { date }, timeout: 25_000 }).then(parseSlots),
    reschedule: (id: string, slot: LabSlot, fallbackDate: string, reason: string) =>
        post<{ success?: boolean; new_booking_id?: string; message?: string }>(
            `/api/bookings/${id}/reschedule`,
            rescheduleBody(slot, fallbackDate, reason),
        ),
};

export const labReports = {
    forBooking: (bookingId: string) =>
        get<{ reports: LabReportSummary[] }>(`/api/reports/booking/${bookingId}`).then((r) => r.reports ?? []),
    /** The detail carries a short-lived viewToken; the stored PDF itself is never exposed. */
    detail: (reportId: string) => get<LabReportDetail>(`/api/reports/${reportId}`),
};

export const labInvoices = {
    link: (bookingId: string) => get<{ token: string; expiresInHours: number }>(`/api/invoices/booking/${bookingId}/link`),
};

/** The public report stream, which an in-app browser can open without an Authorization header. */
export const reportViewUrl = (viewToken: string) => `${API_URL}/api/reports/public/${viewToken}`;

export const invoiceViewUrl = (token: string) => `${API_URL}/api/invoices/public/${token}`;
