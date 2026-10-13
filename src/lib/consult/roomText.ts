import type { CartAddResult, ConsultationStatus, RecommendedTest } from './types';

/** Audio roles may only publish the microphone, so camera buttons are hidden for them. */
export const isAudioRole = (role: string) => role.endsWith('-audio');

export type CallStage = 'connecting' | 'waiting' | 'live';

/** What the big call area shows. Takes LiveKit's ConnectionState string so this file stays free of native code. */
export function callStage(state: string, hasRemote: boolean): { stage: CallStage; reconnecting: boolean } {
  const reconnecting = state === 'reconnecting' || state === 'signalReconnecting';
  if (state !== 'connected' && !reconnecting) return { stage: 'connecting', reconnecting: false };
  return { stage: hasRemote ? 'live' : 'waiting', reconnecting };
}

const WRITABLE: ConsultationStatus[] = ['IN_PROGRESS', 'COMPLETED'];

/** Notes and the first prescription open once the call has started. Same rule as the server. */
export const canWrite = (status: ConsultationStatus) => WRITABLE.includes(status);

/** Why notes cannot be edited right now, or null when they can. */
export function notesLock(record: { status: ConsultationStatus; prescription: unknown }): string | null {
  if (record.prescription) return 'Notes are locked because the prescription has been issued.';
  if (!canWrite(record.status)) return 'Notes open once the call has started.';
  return null;
}

/** Plain lines for the cart result. The app has no lab cart screen yet, so it points to docnow.in. */
export function cartLines(result: CartAddResult, tests: RecommendedTest[]): string[] {
  const name = (code: string) => tests.find((t) => t.code === code)?.name ?? code;
  const lines: string[] = [];
  if (result.added.length > 0) lines.push(`Added to your cart on docnow.in: ${result.added.map(name).join(', ')}.`);
  for (const s of result.skipped) lines.push(`${name(s.code)}: ${s.reason}`);
  if (lines.length === 0) lines.push('There were no tests to add.');
  return lines;
}

/** Follow-up days from the notes form: null when blank, undefined when not a whole number from 1 to 365. */
export function parseFollowUp(text: string): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const days = Number(t);
  return Number.isInteger(days) && days >= 1 && days <= 365 ? days : undefined;
}
