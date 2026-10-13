import { useEffect, useState } from 'react';

import { serverNow } from '@/lib/consult/time';
import { useAppActive } from './use-app-active';

/** The server's clock, re-read every `everyMs` while the app is in front, so a Join button appears on time. */
export function useServerNow(everyMs = 15_000) {
  const [now, setNow] = useState(() => serverNow());
  const active = useAppActive(() => setNow(serverNow()));

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(serverNow()), everyMs);
    return () => clearInterval(t);
  }, [active, everyMs]);

  return now;
}
