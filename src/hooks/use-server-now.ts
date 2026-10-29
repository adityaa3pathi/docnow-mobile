import { useEffect, useState } from 'react';

import { serverNow } from '@/lib/consult/time';

/** The server's clock (so a wrong phone clock cannot skew countdowns), re-read every `intervalMs`. */
export function useServerNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
