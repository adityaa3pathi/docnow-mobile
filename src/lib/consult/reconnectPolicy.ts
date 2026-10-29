import type { ReconnectContext, ReconnectPolicy } from 'livekit-client';

export interface ReconnectState {
  isReconnecting: boolean;
  attempt: number;
  maxAttempts: number;
  elapsedMs: number;
  nextDelayMs: number | null;
}

export type ReconnectListener = (state: ReconnectState) => void;

export const DEFAULT_RECONNECT_DELAYS_MS = [0, 1000, 3000, 6000, 10000] as const;

export class ObservableReconnectPolicy implements ReconnectPolicy {
  public readonly retryDelaysMs: readonly number[];
  private currentAttempt = 0;
  private listeners = new Set<ReconnectListener>();

  constructor(delays: readonly number[] = DEFAULT_RECONNECT_DELAYS_MS) {
    this.retryDelaysMs = delays;
  }

  get maxAttempts(): number {
    return this.retryDelaysMs.length;
  }

  get attempt(): number {
    return this.currentAttempt;
  }

  subscribe(listener: ReconnectListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(isReconnecting: boolean, elapsedMs: number, nextDelayMs: number | null) {
    const state: ReconnectState = {
      isReconnecting,
      attempt: this.currentAttempt,
      maxAttempts: this.maxAttempts,
      elapsedMs,
      nextDelayMs,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Suppress listener error
      }
    }
  }

  nextRetryDelayInMs(context: ReconnectContext): number | null {
    if (context.retryCount < this.retryDelaysMs.length) {
      this.currentAttempt = context.retryCount + 1;
      const delay = this.retryDelaysMs[context.retryCount];
      this.notify(true, context.elapsedMs, delay);
      return delay;
    }
    this.currentAttempt = this.retryDelaysMs.length;
    this.notify(false, context.elapsedMs, null);
    return null;
  }

  reset(): void {
    this.currentAttempt = 0;
    this.notify(false, 0, null);
  }
}
