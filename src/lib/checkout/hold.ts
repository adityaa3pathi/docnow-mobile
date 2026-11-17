/**
 * The slot hold and its countdown, ported from the website's useSlots and SlotSelector so both
 * warn at the same moments. Pure: the screen owns the timer, this owns the wording and thresholds.
 */

/** Healthians holds a frozen slot for 15 minutes. */
export const FREEZE_DURATION_MS = 15 * 60 * 1000;
/** Freeze again once only 3 minutes are left, so a slow checkout does not lose the slot. */
export const AUTO_REFREEZE_AT_MS = 3 * 60 * 1000;
export const WARNING_AT_SECONDS = 5 * 60;
export const URGENT_AT_SECONDS = 2 * 60;

export type HoldLevel = 'none' | 'normal' | 'warning' | 'urgent';

export function holdLevel(locked: boolean, secondsRemaining: number): HoldLevel {
    if (!locked || secondsRemaining <= 0) return 'none';
    if (secondsRemaining <= URGENT_AT_SECONDS) return 'urgent';
    if (secondsRemaining <= WARNING_AT_SECONDS) return 'warning';
    return 'normal';
}

/** 9:05 rather than 545 seconds. */
export function formatCountdown(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The banner sentence for the current urgency, or null when no slot is held. */
export function holdMessage(level: HoldLevel, secondsRemaining: number): string | null {
    const clock = formatCountdown(secondsRemaining);
    if (level === 'urgent') return `Your slot is released in ${clock}. Please finish paying.`;
    if (level === 'warning') return `Please complete your booking soon. ${clock} left.`;
    if (level === 'normal') return `Slot held for ${clock}.`;
    return null;
}

/** Changes only when the level does, so a screen reader hears it once and not every second. */
export function holdAnnouncement(level: HoldLevel): string {
    if (level === 'urgent') return 'Less than 2 minutes left to pay before this slot is released.';
    if (level === 'warning') return 'Less than 5 minutes left to complete your booking.';
    if (level === 'normal') return 'Slot held. Complete payment before the time runs out.';
    return '';
}

export const HOLD_NOTE = 'Your slot is held for 15 minutes. Please complete your booking before the time runs out.';
export const HOLD_EXPIRED = 'That slot hold ran out. Please lock the slot again.';

/** True once the hold is close enough to expiry to renew it, and only once per cycle. */
export function shouldRefreeze(secondsRemaining: number, alreadyAsked: boolean): boolean {
    if (alreadyAsked) return false;
    return secondsRemaining > 0 && secondsRemaining * 1000 <= AUTO_REFREEZE_AT_MS;
}

/** Whole seconds left on a hold, from the server's clock reading passed in. */
export function secondsLeft(expiresAtMs: number | null, nowMs: number): number {
    if (expiresAtMs === null) return 0;
    return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
}

export interface LockButtonView {
    label: string;
    busy: boolean;
    disabled: boolean;
}

/** What the lock control reads. A held slot cannot be locked again by hand. */
export function lockButtonView(hasTime: boolean, freezing: boolean, locked: boolean): LockButtonView {
    if (freezing) return { label: 'Locking the slot', busy: true, disabled: true };
    if (locked) return { label: 'Slot locked', busy: false, disabled: true };
    return { label: 'Lock this slot', busy: false, disabled: !hasTime };
}
