import { useInfiniteQuery } from '@tanstack/react-query';

import { doctor } from '@/lib/consult/api';
import { mergePages } from '@/lib/consult/doctorConsultations';

/** One list per scope. The server gives a cursor while more rows remain. */
export function useDoctorConsultations(scope: 'upcoming' | 'past') {
  const query = useInfiniteQuery({
    queryKey: ['doctor', 'consultations', scope],
    queryFn: ({ pageParam }) => doctor.consultations(scope, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });
  return { ...query, items: mergePages(query.data?.pages ?? []) };
}
