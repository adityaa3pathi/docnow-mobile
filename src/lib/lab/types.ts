/** Shapes the lab booking, report and invoice endpoints return. The server owns every amount. */

export interface LabReportSummary {
    id: string;
    isFullReport: boolean;
    fetchStatus: string;
    verifiedAt: string | null;
    fileSize: number | null;
    generatedAt: string;
    vendorCustomerId?: string | null;
}

export interface LabAddress {
    line1: string | null;
    city: string | null;
    pincode: string | null;
    lat?: string | null;
    long?: string | null;
}

export type BookingChangeType = 'NONE' | 'RESCHEDULED' | 'RESAMPLED';

export interface LabRescheduleInfo {
    newBookingId: string;
    newSlotDate: string | null;
    newSlotTime: string | null;
    rescheduledBy: string;
    rescheduledAt: string | null;
}

/** One row of GET /api/bookings. */
export interface LabBooking {
    id: string;
    partnerBookingId: string | null;
    currentPartnerBookingId?: string | null;
    previousPartnerBookingIds?: string[];
    partnerStatus?: string | null;
    status: string;
    paymentStatus?: string;
    slotDate: string;
    slotTime: string;
    totalAmount: number;
    createdAt: string;
    invoiceAvailable?: boolean;
    rescheduledToId?: string | null;
    trackingReferenceUpdated?: boolean;
    bookingChangeType?: BookingChangeType;
    bookingChangeMessage?: string | null;
    superseded?: boolean;
    items: string[];
    address?: LabAddress | null;
    reports?: LabReportSummary[];
    rescheduleInfo?: LabRescheduleInfo | null;
    isCampBooking?: boolean;
    campName?: string | null;
    campLocation?: string | null;
    campDates?: { start: string; end: string } | null;
}

export interface LabStatusTest {
    test_name?: string;
    test_status?: string | null;
}

export interface LabStatusCustomer {
    vendor_customer_id?: string;
    customer_status?: string | null;
    test_list?: LabStatusTest[];
}

export interface LabLineage {
    currentPartnerBookingId?: string | null;
    previousPartnerBookingIds?: string[];
    trackingReferenceUpdated?: boolean;
    bookingChangeType?: BookingChangeType;
    bookingChangeMessage?: string | null;
}

/** GET /api/bookings/:id/status — the partner's live view, plus our patient names. */
export interface LabStatusResponse {
    data?: {
        booking_id?: string | number;
        booking_status?: string | null;
        customer?: LabStatusCustomer[];
    };
    patientDetails?: Record<string, { name: string; relation: string }>;
    lineage?: LabLineage;
}

export type CheckoutOutcome = 'confirmed' | 'pending' | 'refunded' | 'not_paid';

/** GET /api/bookings/:id/payment-status. amountDue is what the collector still has to take. */
export interface LabPaymentStatus {
    outcome: CheckoutOutcome;
    slotDate?: string;
    slotTime?: string;
    address?: { line1: string | null; city: string | null; pincode: string | null };
    paymentMethod?: string | null;
    amountDue: number;
}

export interface PhleboContact {
    masked_number: string;
    phlebo_name: string;
}

/** Healthians slot rows reach us under several key names, so every field is optional. */
export interface RawSlot {
    stm_id?: string | number;
    slot_id?: string | number;
    id?: string | number;
    slot_time?: string;
    start_time?: string;
    end_time?: string;
    slot_date?: string;
}

export interface LabSlot {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    slotDate: string | null;
}

export interface CancelLabResult {
    message: string;
    bookingStatus?: string;
    paymentStatus?: string;
    refundStatus?: 'not_applicable' | 'refunded' | 'manual_required';
    manualRefundRequired?: boolean;
}

/** GET /api/reports/:id — the viewToken opens the public stream without an auth header. */
export interface LabReportDetail extends LabReportSummary {
    bookingId: string;
    collectedOn: string | null;
    patientName: string | null;
    tests: string[];
    viewToken: string;
}
