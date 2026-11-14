/**
 * Reading a camp list: the status pill, the dates and the city grouping. Pure, so it is tested
 * without the API. The wording is the website's camps page, word for word.
 */
import type { Tone } from '@/lib/consult/status';
import { formatIstDate } from '@/lib/lab/bookings';

import type { ActiveCamp, CampDetail } from './types';

const DAY_MS = 86_400_000;

export interface CampStatus {
    label: string;
    tone: Tone;
}

/** The three states the website shows: running now, starting within three days, or later. */
export function campStatus(startDate: string, endDate: string, now: number = Date.now()): CampStatus {
    const start = Date.parse(startDate);
    const end = Date.parse(endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) return { label: 'Upcoming', tone: 'info' };
    if (now >= start && now <= end) return { label: 'Happening Now', tone: 'success' };
    if (now > end) return { label: 'Ended', tone: 'muted' };
    const days = Math.ceil((start - now) / DAY_MS);
    if (days <= 3) return { label: `Starts in ${days}d`, tone: 'warning' };
    return { label: 'Upcoming', tone: 'info' };
}

export function formatCampDate(iso: string): string {
    return formatIstDate(iso);
}

/** "9 Nov 2026 — 11 Nov 2026", or one date when the camp runs for a single day. */
export function campDateRange(startDate: string, endDate: string): string {
    const start = formatCampDate(startDate);
    const end = formatCampDate(endDate);
    return start === end ? start : `${start} — ${end}`;
}

export function campPlace(camp: Pick<ActiveCamp, 'location' | 'city'>): string {
    return [camp.location, camp.city].filter(Boolean).join(', ');
}

/** The camp's full postal address, as the server holds it. */
export function campAddress(camp: Pick<CampDetail, 'location' | 'city' | 'pincode'>): string {
    return [camp.location, camp.city, camp.pincode].filter(Boolean).join(', ');
}

export function testCount(camp: ActiveCamp | CampDetail): number {
    if ('items' in camp && Array.isArray(camp.items)) return camp.items.length;
    return camp._count?.items ?? 0;
}

export function testCountLabel(count: number): string {
    return `${count} tests included`;
}

export function campsCountLabel(count: number): string {
    return `${count} active camp${count !== 1 ? 's' : ''} available`;
}

/** The server may wrap either reply in a key, as the website's own unwrapping allows for. */
export function parseCampList(payload: unknown): ActiveCamp[] {
    if (Array.isArray(payload)) return payload as ActiveCamp[];
    const wrapped = (payload as { camps?: unknown } | null)?.camps;
    return Array.isArray(wrapped) ? (wrapped as ActiveCamp[]) : [];
}

export function parseCampDetail(payload: unknown): CampDetail | null {
    const wrapped = (payload as { camp?: unknown } | null)?.camp;
    const camp = (wrapped ?? payload) as CampDetail | null;
    if (!camp || typeof camp.id !== 'string') return null;
    return { ...camp, items: Array.isArray(camp.items) ? camp.items : [] };
}

export interface CampCityGroup {
    city: string;
    camps: ActiveCamp[];
}

/**
 * Camps by city, the chosen city first so a person sees their own town without scrolling.
 * Within a city the soonest camp leads, which is the order the server already sends.
 */
export function campCityGroups(camps: ActiveCamp[], selectedCity?: string | null): CampCityGroup[] {
    const groups = new Map<string, ActiveCamp[]>();
    for (const camp of camps) {
        const city = camp.city?.trim() || 'Other';
        const list = groups.get(city) ?? [];
        list.push(camp);
        groups.set(city, list);
    }
    const wanted = selectedCity?.trim().toLowerCase() ?? '';
    return [...groups.entries()]
        .map(([city, list]) => ({
            city,
            camps: [...list].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate)),
        }))
        .sort((a, b) => {
            const aMine = a.city.toLowerCase() === wanted;
            const bMine = b.city.toLowerCase() === wanted;
            if (aMine !== bMine) return aMine ? -1 : 1;
            return a.city.localeCompare(b.city);
        });
}
