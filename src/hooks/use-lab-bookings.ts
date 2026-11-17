import { useQuery } from '@tanstack/react-query';

import { lab } from '@/lib/lab/api';
import type { LabBooking } from '@/lib/lab/types';

const BOOKINGS_KEY = ['lab', 'bookings'] as const;

/** One list for every lab screen, so a cancel on the details screen refreshes the list too. */
export function useLabBookings() {
    return useQuery({ queryKey: BOOKINGS_KEY, queryFn: lab.bookings, staleTime: 0 });
}

/** The details screen reads its booking out of the same list; there is no per-booking route. */
export function useLabBooking(id: string) {
    const query = useLabBookings();
    const booking: LabBooking | null = query.data?.find((b) => b.id === id) ?? null;
    return { ...query, booking };
}

export const labBookingsKey = BOOKINGS_KEY;
