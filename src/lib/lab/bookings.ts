// Grouping and date text for the lab bookings list. Pure, so it can be tested without the API.
import { labStatusFor } from './status';
import type { LabBooking } from './types';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST_DAY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** Today in India as 2026-11-14, which sorts and compares as text. */
export function istDayKey(at: number = Date.now()): string {
    return IST_DAY.format(new Date(at));
}

/** Indian calendar day shifted by whole days, for the earliest date a reschedule may use. */
export function istDayKeyPlus(days: number, at: number = Date.now()): string {
    return istDayKey(at + days * 86_400_000);
}

/** slotDate is already a plain date from the lab partner; anything else falls back to the clock. */
export function slotDayKey(slotDate: string): string {
    const parts = DATE_ONLY.exec(slotDate);
    if (parts) return `${parts[1]}-${parts[2]}-${parts[3]}`;
    const parsed = Date.parse(slotDate);
    return Number.isNaN(parsed) ? '' : istDayKey(parsed);
}

/** "20 Nov 2026". Built from the date text so a device time zone cannot shift the day. */
export function formatSlotDate(slotDate: string): string {
    const key = slotDayKey(slotDate);
    const parts = DATE_ONLY.exec(key);
    if (!parts) return slotDate;
    const month = MONTHS[Number(parts[2]) - 1] ?? parts[2];
    return `${Number(parts[3])} ${month} ${parts[1]}`;
}

/** Some bookings carry a slot id instead of a time, which must never be shown as a time. */
export function isReadableSlotTime(slotTime?: string | null): boolean {
    return Boolean(slotTime && slotTime.trim() !== '' && !/^\d+$/.test(slotTime.trim()));
}

export function formatSlot(booking: Pick<LabBooking, 'slotDate' | 'slotTime'>): string {
    const date = formatSlotDate(booking.slotDate);
    return isReadableSlotTime(booking.slotTime) ? `${date}, ${booking.slotTime}` : date;
}

const FINISHED_LABELS = new Set([
    'Cancelled',
    'Refunded',
    'Superseded',
    'Report ready',
    'Report generated',
    'Report available',
    'Health counselling done',
]);

export interface BookingGroups {
    upcoming: LabBooking[];
    past: LabBooking[];
    /** Replaced booking references are hidden, and the list says so when any were. */
    hiddenSuperseded: number;
}

/**
 * Upcoming means the journey is still running and the slot has not passed. Everything else is past,
 * newest first, which is how the website orders its cards.
 */
export function groupLabBookings(bookings: LabBooking[], today: string = istDayKey()): BookingGroups {
    const visible = bookings.filter((b) => !b.superseded);
    const upcoming: LabBooking[] = [];
    const past: LabBooking[] = [];

    for (const booking of visible) {
        const label = labStatusFor(booking).label;
        const day = slotDayKey(booking.slotDate);
        const finished = FINISHED_LABELS.has(label) || (day !== '' && day < today);
        (finished ? past : upcoming).push(booking);
    }

    upcoming.sort((a, b) => slotDayKey(a.slotDate).localeCompare(slotDayKey(b.slotDate)));
    past.sort((a, b) => slotDayKey(b.slotDate).localeCompare(slotDayKey(a.slotDate)));
    return { upcoming, past, hiddenSuperseded: bookings.length - visible.length };
}

/** Bookings that have at least one report row, newest slot first, for the reports screen. */
export function bookingsWithReports(bookings: LabBooking[]): LabBooking[] {
    return bookings
        .filter((b) => (b.reports?.length ?? 0) > 0)
        .sort((a, b) => slotDayKey(b.slotDate).localeCompare(slotDayKey(a.slotDate)));
}

const IST_DATE = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** An instant, such as a report's generated time, as the Indian date it fell on. */
export function formatIstDate(iso: string): string {
    const at = Date.parse(iso);
    return Number.isNaN(at) ? iso : IST_DATE.format(at);
}

export function formatFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
