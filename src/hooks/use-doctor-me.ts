import { useQuery } from '@tanstack/react-query';

import { useAppActive } from '@/hooks/use-app-active';
import { doctor, errorStatus } from '@/lib/consult/api';
import type { DoctorMe } from '@/lib/consult/types';

export const DOCTOR_ME_KEY = ['doctor', 'me'] as const;

/** A 404 means no application yet, so it is `null` and not an error. */
export async function fetchDoctorMe(): Promise<DoctorMe | null> {
  try {
    return await doctor.me();
  } catch (e) {
    if (errorStatus(e) === 404) return null;
    throw e;
  }
}

/** The signed-in user's own doctor status. Re-read each time the app comes back to the front. */
export function useDoctorMe() {
  const query = useQuery({ queryKey: DOCTOR_ME_KEY, queryFn: fetchDoctorMe, staleTime: 0, retry: 1 });
  const { refetch } = query;
  useAppActive(() => void refetch());
  return query;
}
