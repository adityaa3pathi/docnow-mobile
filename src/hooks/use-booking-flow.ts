// Adapted from docnowtesting/client/src/hooks/useBookingFlow.ts for React Native.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth';
import {
  announceThreshold, applyVerifyHint, decide, isFinalResult, LATE_WATCH_INTERVAL_MS, LATE_WATCH_MAX_TICKS,
  POLL_INTERVAL_MS, type Decision,
} from '@/lib/consult/bookingFlow';
import { consult, errorStatus, friendlyError } from '@/lib/consult/api';
import { acquire, checkoutKey, release } from '@/lib/consult/checkoutLock';
import { clearActiveBooking, forgetKey, loadActiveBooking } from '@/lib/consult/store';
import { secondsUntil, serverNow } from '@/lib/consult/time';
import type { BookingView, VerifyOutcome } from '@/lib/consult/types';
import { openCheckout, type PaymentResult } from '@/lib/razorpay';
import { useAppActive } from './use-app-active';

const DISMISS_RECHECK_MS = [3000, 4000];

/** Drives one booking from the pay screen to a settled result. The server's booking is the truth. */
export function useBookingFlow(id: string, enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmStartedAt, setConfirmStartedAt] = useState<number | null>(null);
  const [hint, setHint] = useState<VerifyOutcome | null>(null);
  const [payNote, setPayNote] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const alive = useRef(true);
  const lastSeconds = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const view = await consult.booking(id);
      if (!alive.current) return null;
      setBooking(view);
      setError(null);
      return view;
    } catch (e) {
      if (alive.current) setError({ message: friendlyError(e), status: errorStatus(e) });
      if (errorStatus(e) === 404) {
        const saved = await loadActiveBooking();
        // Someone else's booking answers 404, so only the owner's record may be cleared.
        if (saved?.id === id && saved.userId === userId) await clearActiveBooking();
      }
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [id, userId]);

  // The screen re-reads at once when the app returns, since a UPI app may have settled things.
  const active = useAppActive(() => {
    if (enabled) void load();
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    // The first read starts a fetch; state is only set after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!active) return;
    // Catches the clock up at once when the app returns to the front.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const decision: Decision | null = useMemo(() => {
    if (!booking) return null;
    return applyVerifyHint(decide(booking, { nowMs: serverNow(now), confirmStartedAt }), hint);
  }, [booking, now, confirmStartedAt, hint]);

  // A payment seen on the server starts the 60 second confirming window.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (booking?.paymentCaptured && confirmStartedAt === null) setConfirmStartedAt(serverNow());
  }, [booking?.paymentCaptured, confirmStartedAt]);

  const polling = decision?.kind === 'poll' && active;
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [polling, load]);

  const result = decision?.kind === 'result' ? decision.result : null;

  // A late webhook can still settle these, so keep checking slowly for a while.
  const lateWatch = (result === 'still_confirming' || result === 'hold_ended') && active;
  useEffect(() => {
    if (!lateWatch) return;
    let ticks = 0;
    const t = setInterval(() => {
      ticks += 1;
      if (ticks > LATE_WATCH_MAX_TICKS) clearInterval(t);
      else void load();
    }, LATE_WATCH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [lateWatch, load]);

  useEffect(() => {
    if (!result || !isFinalResult(result)) return;
    void (async () => {
      const saved = await loadActiveBooking();
      if (saved?.id !== id || saved.userId !== userId) return;
      // A dead booking must not hand its key to the next attempt.
      if (result !== 'booked') await forgetKey(saved.slotId, saved.patientId);
      await clearActiveBooking();
    })();
  }, [result, id, userId]);

  const secondsLeft = booking ? secondsUntil(booking.holdExpiresAt, now) : 0;
  useEffect(() => {
    if (decision?.kind !== 'pay') {
      lastSeconds.current = null;
      return;
    }
    const crossed = announceThreshold(lastSeconds.current, secondsLeft);
    lastSeconds.current = secondsLeft;
    if (crossed === null) return;
    setAnnouncement(crossed === 0 ? 'Your hold has ended.' : `${crossed / 60} ${crossed === 60 ? 'minute' : 'minutes'} left to pay.`);
  }, [secondsLeft, decision?.kind]);

  const onPaid = useCallback(
    async (res: PaymentResult) => {
      setPayNote(null);
      setConfirmStartedAt(serverNow());
      try {
        const out = await consult.verify(id, res);
        if (alive.current) setHint(out.outcome);
      } catch {
        // A failed verify says nothing about the payment, so the load below decides.
      }
      await load();
    },
    [id, load],
  );

  const pay = useCallback(async () => {
    if (!booking || opening || !acquire(checkoutKey(id))) return;
    const lockId = checkoutKey(id);
    setPayNote(null);
    const fresh = await load();
    if (!fresh) {
      release(lockId);
      if (alive.current) setPayNote('We could not check your booking. Check your connection and try again.');
      return;
    }
    if (decide(fresh, { nowMs: serverNow(), confirmStartedAt }).kind !== 'pay') {
      release(lockId);
      return;
    }
    if (!fresh.razorpayOrderId || !fresh.keyId) {
      release(lockId);
      setPayNote('This booking is not ready for payment. Please try again in a moment.');
      return;
    }
    setOpening(true);
    try {
      const outcome = await openCheckout({
        keyId: fresh.keyId,
        orderId: fresh.razorpayOrderId,
        amountPaise: fresh.amountPaise,
        description: `Consultation with ${fresh.doctorName}`,
        prefill: user ? { name: user.name ?? undefined, contact: user.mobile, email: user.email ?? undefined } : undefined,
      });
      if (outcome.kind === 'paid') {
        await onPaid(outcome.payment);
      } else if (outcome.kind === 'dismissed') {
        // Closing checkout proves nothing about payment, and a UPI payment can land after it closes.
        for (const wait of DISMISS_RECHECK_MS) {
          await load();
          if (!alive.current) return;
          await new Promise((r) => setTimeout(r, wait));
        }
        await load();
      } else if (outcome.kind === 'failed') {
        if (alive.current) setPayNote(outcome.message);
        await load();
      } else if (alive.current) {
        setPayNote('We could not open the payment window. Check your connection and try again.');
      }
    } finally {
      release(lockId);
      if (alive.current) setOpening(false);
    }
  }, [booking, opening, id, load, confirmStartedAt, onPaid, user]);

  return {
    booking, loading, error, decision, secondsLeft, announcement, payNote, opening, paidHere: confirmStartedAt !== null, refetch: load, pay,
  };
}
