// The picker works in the phone's zone, so its local fields are read as Indian time.
// That way the same numbers show and send on any phone.
const pad = (n: number) => String(n).padStart(2, '0');

/** Date from the picker to "YYYY-MM-DDTHH:mm", using the picker's local fields. */
export function pickerToLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date from a time-only picker to "HH:mm". */
export function pickerToTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A Date whose local fields show this "YYYY-MM-DDTHH:mm", for feeding a picker. */
export function localToPicker(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

/** A Date whose local time shows "HH:mm" (24:00 shows as 23:59 on screen only). */
export function timeToPicker(time: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  const h = m ? Math.min(Number(m[1]), 23) : 9;
  const mi = m ? (Number(m[1]) >= 24 ? 59 : Number(m[2])) : 0;
  return new Date(2000, 0, 1, h, mi);
}
