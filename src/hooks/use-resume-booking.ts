import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/lib/auth';
import { decide, resumeAction } from '@/lib/consult/bookingFlow';
import { consult, errorStatus } from '@/lib/consult/api';
import { acquire, anyCheckoutOpen, release, resumeKey } from '@/lib/consult/checkoutLock';
import { clearActiveBooking, forgetKey, loadActiveBooking } from '@/lib/consult/store';
import { serverNow } from '@/lib/consult/time';
import { useAppActive } from './use-app-active';

/** Finds a booking that was being paid when the app closed, at sign-in and on each return to the app. */
export function useResumeBooking() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  });
  const userId = user?.id;
  const userRef = useRef(userId);
  useEffect(() => {
    userRef.current = userId;
  });

  const check = useCallback(async () => {
    if (!userId || anyCheckoutOpen()) return;
    const saved = await loadActiveBooking();
    // Another account's record is left alone: only its owner may resume or clear it.
    if (!saved || saved.userId !== userId) return;
    // The booking screen already re-reads when the app returns.
    if (pathRef.current === `/consult/booking/${saved.id}`) return;
    const lock = resumeKey(saved.id);
    if (!acquire(lock)) return;
    try {
      let view;
      try {
        view = await consult.booking(saved.id);
      } catch (e) {
        // A network or server error keeps the record for the next return to the app.
        if (errorStatus(e) === 404) {
          const current = await loadActiveBooking();
          if (current?.id === saved.id) await clearActiveBooking();
        }
        return;
      }
      // The user may have signed out or switched during the read.
      if (userRef.current !== userId) return;
      const now = serverNow();
      if (resumeAction(saved, userId, view, now) === 'clear') {
        const d = decide(view, { nowMs: now, confirmStartedAt: null });
        if (!(d.kind === 'result' && d.result === 'booked')) await forgetKey(saved.slotId, saved.patientId);
        const current = await loadActiveBooking();
        if (current?.id === saved.id) await clearActiveBooking();
        return;
      }
      const target = `/consult/booking/${saved.id}`;
      if (anyCheckoutOpen() || pathRef.current === target) return;
      // Replace when a booking screen is already in front, so screens never stack.
      if (pathRef.current.startsWith('/consult/booking/') || pathRef.current === '/consult/book') router.replace(target);
      else router.push(target);
    } finally {
      release(lock);
    }
  }, [userId, router]);

  useAppActive(() => void check());

  useEffect(() => {
    void check();
  }, [check]);
}
