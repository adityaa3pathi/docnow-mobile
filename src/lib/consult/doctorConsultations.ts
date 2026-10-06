import { statusInfo, type Tone } from './status';
import { groupSlotsByDay, type DaySlots } from './time';
import type { ConsultationStatus, DoctorConsultation } from './types';

/** Adds a later page to the list, keeping one copy of any booking that shows twice. */
export function mergePages(pages: { items: DoctorConsultation[] }[]): DoctorConsultation[] {
  const seen = new Set<string>();
  const out: DoctorConsultation[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/** Groups by Indian day, in the order given (the server already sorts). */
export function groupByIstDay(items: DoctorConsultation[], descending = false): DaySlots<DoctorConsultation>[] {
  const days = groupSlotsByDay(items);
  if (!descending) return days;
  return days.reverse().map((d) => ({ ...d, slots: [...d.slots].reverse() }));
}

/** Words for a doctor. A refund is the patient's business, so it reads as Cancelled. */
export function doctorStatusLabel(status: ConsultationStatus): { label: string; tone: Tone } {
  if (status === 'REFUNDED') return { label: 'Cancelled', tone: 'muted' };
  const { label, tone } = statusInfo(status);
  return { label, tone };
}
