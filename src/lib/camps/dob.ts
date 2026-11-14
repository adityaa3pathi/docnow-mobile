/**
 * Date of birth as the plain "YYYY-MM-DD" the camp checkout takes. Built from calendar fields,
 * never from an instant, so a device time zone cannot shift the day by one.
 */
const DOB_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** The picker hands back a local date, so its own year, month and day are the answer. */
export function dobKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDobKey(key: string): Date | null {
    const parts = DOB_KEY.exec(key);
    if (!parts) return null;
    const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

/** A saved patient's dob comes back as a full timestamp, of which only the date matters. */
export function dobFromPerson(dob?: string | null): string {
    if (!dob) return '';
    const key = dob.split('T')[0] ?? '';
    return DOB_KEY.test(key) ? key : '';
}

export function formatDob(key: string): string {
    const parts = DOB_KEY.exec(key);
    if (!parts) return '';
    const month = MONTHS[Number(parts[2]) - 1] ?? parts[2];
    return `${Number(parts[3])} ${month} ${parts[1]}`;
}

/** A birth date must be a real past date; the server takes nothing else. */
export function isDobUsable(key: string, today: Date = new Date()): boolean {
    const date = parseDobKey(key);
    if (!date) return false;
    return key <= dobKey(today);
}
