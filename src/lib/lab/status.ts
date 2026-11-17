// Ported from the website's components/profile/bookings/types.ts so a booking reads the same in
// both places. The website's Tailwind classes become the app's theme tones.
import type { Tone } from '@/lib/consult/status';
import type { LabBooking, LabReportSummary } from './types';

export interface LabStatusInfo {
    label: string;
    tone: Tone;
    /** 1 to 5 along the collection journey; 0 means the journey stopped. */
    step: number;
    message: string;
    subMessage?: string;
    referenceCode?: string;
}

const booked: LabStatusInfo = {
    label: 'Order booked',
    tone: 'info',
    step: 1,
    message: 'Your booking has been placed.',
};

const cancelled: LabStatusInfo = {
    label: 'Cancelled',
    tone: 'danger',
    step: 0,
    message: 'This booking has been cancelled.',
};

const collectorAssigned: LabStatusInfo = {
    label: 'Sample collector assigned',
    tone: 'info',
    step: 3,
    message: 'A collector has been assigned and will arrive during your slot.',
};

const collectorReached: LabStatusInfo = {
    label: 'Sample collector reached',
    tone: 'info',
    step: 3,
    message: 'Your collector has reached your address.',
};

const sampleCollected: LabStatusInfo = {
    label: 'Sample collected',
    tone: 'info',
    step: 4,
    message: 'Your sample has been collected and is on its way for processing.',
};

const sampleAtLab: LabStatusInfo = {
    label: 'Sample received at lab',
    tone: 'info',
    step: 4,
    message: 'Your sample has reached the lab and testing is underway.',
};

const resample: LabStatusInfo = {
    label: 'Fresh sample needed',
    tone: 'danger',
    step: 2,
    message: 'The lab has asked for a fresh sample collection.',
    subMessage: 'Our team will help arrange the next slot for recollection.',
};

const rescheduled: LabStatusInfo = {
    label: 'Rescheduled',
    tone: 'warning',
    step: 2,
    message: 'Your collection slot has been updated.',
    subMessage: 'We have refreshed your booking with the latest schedule from our lab partner.',
};

const registered: LabStatusInfo = {
    label: 'Registered',
    tone: 'info',
    step: 1,
    message: 'You are registered for this health camp.',
    subMessage: 'Please visit the camp location on the scheduled date with a valid ID.',
};

const reportReady: LabStatusInfo = {
    label: 'Report ready',
    tone: 'success',
    step: 5,
    message: 'Your report is ready to view.',
};

/** Keyed by partner BS code and by our own status text, exactly as the website keys it. */
export const LAB_STATUS_MAP: Record<string, LabStatusInfo> = {
    BS002: booked,
    BS003: cancelled,
    BS005: collectorAssigned,
    BS006: collectorReached,
    BS007: sampleCollected,
    BS008: sampleAtLab,
    BS009: {
        label: 'Report generated',
        tone: 'success',
        step: 5,
        message: 'Your report has been generated and is going through a final check.',
    },
    BS0012: {
        label: 'Health counselling done',
        tone: 'success',
        step: 5,
        message: 'Your health counselling session is complete.',
    },
    BS015: {
        label: 'Report available',
        tone: 'success',
        step: 5,
        message: 'Your report is ready to view.',
    },
    BS0013: {
        ...rescheduled,
        message: 'This booking has been rescheduled to a new slot.',
    },
    BS0018: resample,
    BS018: resample,
    'Order Booked': booked,
    Registered: registered,
    'Camp Registered': registered,
    Cancelled: cancelled,
    'Sample Collector Assigned': collectorAssigned,
    'Sample Collector Reached': collectorReached,
    'Sample Collected': sampleCollected,
    'Sample Received at Lab': sampleAtLab,
    Rescheduled: rescheduled,
    Superseded: {
        label: 'Superseded',
        tone: 'muted',
        step: 0,
        message: 'This booking has been replaced by a newer booking reference.',
    },
    'Resample Required': resample,
    'Report Generated': reportReady,
    'Report Available': reportReady,
    'Health Counselling Done': {
        label: 'Health counselling done',
        tone: 'success',
        step: 5,
        message: 'Your health counselling session is complete.',
    },
    'Awaiting Payment': {
        label: 'Awaiting payment',
        tone: 'warning',
        step: 0,
        message: 'Your booking will be confirmed once payment is received.',
    },
    Refunded: {
        label: 'Refunded',
        tone: 'danger',
        step: 0,
        message: 'This booking could not be completed and has been refunded.',
    },
};

const UNKNOWN_PARTNER_STATUS: LabStatusInfo = {
    label: 'Update received',
    tone: 'muted',
    step: 4,
    message: 'We have an update from our lab partner and your booking is moving forward.',
    subMessage: 'You can keep checking here for the latest status.',
};

/** Pulls "BS008" out of a code or out of text that carries one. */
export function extractPartnerCode(status?: string | null): string | undefined {
    if (!status) return undefined;
    const direct = /^BS\d+$/i.exec(status);
    if (direct) return direct[0].toUpperCase();
    return /BS\d+/i.exec(status)?.[0]?.toUpperCase();
}

/** The report worth showing: a stored full report first, then any stored one, then a pending one. */
export function getLatestReport(reports?: LabReportSummary[]): LabReportSummary | undefined {
    if (!reports?.length) return undefined;
    const stored = reports.filter((r) => r.fetchStatus === 'STORED');
    if (stored.length > 0) return stored.find((r) => r.isFullReport) ?? stored[0];
    return reports.find((r) => r.fetchStatus === 'PENDING') ?? reports[0];
}

export function getLabStatusDisplay(
    status?: string | null,
    reports?: LabReportSummary[],
    partnerStatus?: string | null,
): LabStatusInfo {
    if (getLatestReport(reports)?.fetchStatus === 'STORED') return reportReady;
    if (status && LAB_STATUS_MAP[status]) return LAB_STATUS_MAP[status];

    const fromStatus = extractPartnerCode(status);
    if (fromStatus && LAB_STATUS_MAP[fromStatus]) {
        return { ...LAB_STATUS_MAP[fromStatus], referenceCode: fromStatus };
    }
    const fromPartner = extractPartnerCode(partnerStatus);
    if (fromPartner && LAB_STATUS_MAP[fromPartner]) {
        return { ...LAB_STATUS_MAP[fromPartner], referenceCode: fromPartner };
    }
    const code = fromPartner ?? fromStatus;
    if (code) return { ...UNKNOWN_PARTNER_STATUS, referenceCode: code };
    return status ? { ...UNKNOWN_PARTNER_STATUS, label: status } : UNKNOWN_PARTNER_STATUS;
}

/** A paid camp registration has no collection journey, so it reads as registered. */
export function effectiveBookingStatus(booking: LabBooking): string {
    const paid = ['CONFIRMED', 'PAID', 'AUTHORIZED'].includes(booking.paymentStatus ?? '');
    return booking.isCampBooking && paid ? 'Registered' : booking.status;
}

export function labStatusFor(booking: LabBooking): LabStatusInfo {
    return getLabStatusDisplay(effectiveBookingStatus(booking), booking.reports, booking.partnerStatus);
}

export type ReportAction =
    | { kind: 'none' }
    | { kind: 'view'; report: LabReportSummary }
    | { kind: 'retry'; report: LabReportSummary }
    | { kind: 'processing'; report: LabReportSummary };

export function getReportAction(reports?: LabReportSummary[]): ReportAction {
    const report = getLatestReport(reports);
    if (!report) return { kind: 'none' };
    if (report.fetchStatus === 'STORED') return { kind: 'view', report };
    if (report.fetchStatus === 'FAILED') return { kind: 'retry', report };
    return { kind: 'processing', report };
}

export interface JourneyBanner {
    tone: 'info' | 'warning';
    title: string;
    description: string;
}

/** Both a list row and the live status lineage carry these fields, so either can build the banner. */
export type BookingChange = Pick<LabBooking, 'bookingChangeType' | 'bookingChangeMessage' | 'trackingReferenceUpdated'>;

export function getJourneyBanner(booking: BookingChange, info?: LabStatusInfo): JourneyBanner | null {
    if (booking.bookingChangeType === 'RESAMPLED') {
        return {
            tone: 'warning',
            title: 'Fresh sample requested',
            description:
                booking.bookingChangeMessage ??
                info?.subMessage ??
                'The lab has asked for another sample collection for this booking.',
        };
    }
    if (booking.bookingChangeType === 'RESCHEDULED') {
        return {
            tone: 'info',
            title: 'Collection rescheduled',
            description:
                booking.bookingChangeMessage ??
                info?.subMessage ??
                'We have updated your booking with the latest schedule from our lab partner.',
        };
    }
    if (booking.trackingReferenceUpdated) {
        return {
            tone: 'info',
            title: 'Tracking reference updated',
            description: 'This is still the same booking. Our lab partner changed the reference it tracks it under.',
        };
    }
    return null;
}

const RESCHEDULABLE = ['Order booked', 'Sample collector assigned', 'Fresh sample needed', 'Rescheduled'];
const NOT_CANCELLABLE = [
    'Cancelled',
    'Sample collected',
    'Sample received at lab',
    'Report generated',
    'Report ready',
    'Report available',
    'Health counselling done',
    'Superseded',
    'Refunded',
];
const COLLECTOR_VISIBLE = ['Sample collector assigned', 'Sample collector reached', 'Sample collected'];
const COLLECTOR_REACHABLE = ['Sample collector assigned', 'Sample collector reached'];

export interface BookingActions {
    canTrack: boolean;
    canReschedule: boolean;
    canCancel: boolean;
    showCollector: boolean;
    canCallCollector: boolean;
    partnerBookingId: string | null;
}

/** The same gates the website puts on its buttons, so the app never offers a call the server refuses. */
export function bookingActions(booking: LabBooking, info: LabStatusInfo): BookingActions {
    const camp = Boolean(booking.isCampBooking);
    const awaitingPayment = booking.paymentStatus === 'INITIATED' || info.label === 'Awaiting payment';
    const partnerBookingId =
        booking.currentPartnerBookingId ?? booking.rescheduledToId ?? booking.partnerBookingId ?? null;
    return {
        canTrack:
            !camp &&
            !awaitingPayment &&
            Boolean(partnerBookingId) &&
            !['Superseded', 'Refunded', 'Cancelled'].includes(info.label),
        canReschedule: !camp && RESCHEDULABLE.includes(info.label),
        canCancel: !camp && !NOT_CANCELLABLE.includes(info.label),
        showCollector: !camp && COLLECTOR_VISIBLE.includes(info.label),
        canCallCollector: !camp && COLLECTOR_REACHABLE.includes(info.label),
        partnerBookingId,
    };
}
