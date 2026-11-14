import { useCallback, useEffect, useState } from 'react';

import { RESEND_SECONDS } from '@/lib/account/auth-forms';

/** The 10-second wait before "Resend OTP" works again, counted down once a second. */
export function useResendTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const start = useCallback(() => setSeconds(RESEND_SECONDS), []);
  return { seconds, start };
}
