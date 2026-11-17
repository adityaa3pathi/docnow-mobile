import { describe, expect, it, vi } from 'vitest';
import { ObservableReconnectPolicy } from './reconnectPolicy';

describe('ObservableReconnectPolicy', () => {
  it('follows progressive backoff delays and exhausts after 5 attempts', () => {
    const policy = new ObservableReconnectPolicy([0, 1000, 3000, 6000, 10000]);
    const listener = vi.fn();
    const unsubscribe = policy.subscribe(listener);

    expect(policy.maxAttempts).toBe(5);

    // Attempt 1
    const d1 = policy.nextRetryDelayInMs({ retryCount: 0, elapsedMs: 100 });
    expect(d1).toBe(0);
    expect(policy.attempt).toBe(1);
    expect(listener).toHaveBeenLastCalledWith({
      isReconnecting: true,
      attempt: 1,
      maxAttempts: 5,
      elapsedMs: 100,
      nextDelayMs: 0,
    });

    // Attempt 2
    const d2 = policy.nextRetryDelayInMs({ retryCount: 1, elapsedMs: 1200 });
    expect(d2).toBe(1000);
    expect(policy.attempt).toBe(2);

    // Attempt 3
    const d3 = policy.nextRetryDelayInMs({ retryCount: 2, elapsedMs: 4500 });
    expect(d3).toBe(3000);

    // Attempt 4
    const d4 = policy.nextRetryDelayInMs({ retryCount: 3, elapsedMs: 11000 });
    expect(d4).toBe(6000);

    // Attempt 5
    const d5 = policy.nextRetryDelayInMs({ retryCount: 4, elapsedMs: 17500 });
    expect(d5).toBe(10000);
    expect(policy.attempt).toBe(5);

    // Exhausted
    const d6 = policy.nextRetryDelayInMs({ retryCount: 5, elapsedMs: 28000 });
    expect(d6).toBeNull();
    expect(listener).toHaveBeenLastCalledWith({
      isReconnecting: false,
      attempt: 5,
      maxAttempts: 5,
      elapsedMs: 28000,
      nextDelayMs: null,
    });

    unsubscribe();
  });

  it('resets cleanly when reset() is called', () => {
    const policy = new ObservableReconnectPolicy();
    policy.nextRetryDelayInMs({ retryCount: 0, elapsedMs: 0 });
    expect(policy.attempt).toBe(1);

    policy.reset();
    expect(policy.attempt).toBe(0);
  });
});
