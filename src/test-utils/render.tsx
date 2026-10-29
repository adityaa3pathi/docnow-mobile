import { act, useLayoutEffect, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { onTestFinished, vi } from 'vitest';

type Mounted = { root: Root; container: HTMLElement };
const mounted = new Set<Mounted>();

/** Unmounts everything rendered in the current test. Call from afterEach. */
export async function cleanup() {
  for (const m of mounted) {
    await act(async () => m.root.unmount());
    m.container.remove();
  }
  mounted.clear();
}

/** Lets pending promise chains (mocked API calls) settle inside act(). Works with real and fake timers. */
export async function flush(rounds = 10) {
  await act(async () => {
    for (let i = 0; i < rounds; i++) await Promise.resolve();
  });
}

/** Retries an assertion, flushing microtasks between attempts. Never uses timers, so it is safe under fake timers. */
export async function waitFor(assertion: () => void, attempts = 50) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      assertion();
      return;
    } catch (err) {
      lastError = err;
      await flush();
    }
  }
  throw lastError;
}

/**
 * Advances fake timers one second at a time, each second in its own act(), so React commits
 * after every tick exactly as it does on a device (one interval tick → one render).
 */
export async function advanceSeconds(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  }
}

export async function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.add({ root, container });
  await act(async () => root.render(ui));

  const queryByTestId = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  return {
    container,
    queryByTestId,
    getByTestId(id: string) {
      const el = queryByTestId(id);
      if (!el) throw new Error(`No element with testID "${id}"`);
      return el;
    },
    queryAllByTestIdPrefix: (prefix: string) =>
      Array.from(container.querySelectorAll<HTMLElement>(`[data-testid^="${prefix}"]`)),
    async press(id: string) {
      const el = queryByTestId(id);
      if (!el) throw new Error(`No element with testID "${id}"`);
      await act(async () => el.click());
    },
    rerender: (next: ReactElement) => act(async () => root.render(next)),
  };
}

/**
 * Minimal renderHook. `result.current` is the latest render; `result.commits` holds the value
 * of every *committed* render, so tests can assert on intermediate UI states (flicker, tearing).
 */
export async function renderHook<T>(hook: () => T, wrapper: ComponentType<{ children: ReactNode }>) {
  const result = { current: undefined as unknown as T, commits: [] as T[] };
  function Probe() {
    const value = hook();
    result.current = value;
    useLayoutEffect(() => {
      result.commits.push(value);
    });
    return null;
  }
  const Wrapper = wrapper;
  await render(
    <Wrapper>
      <Probe />
    </Wrapper>,
  );
  return { result };
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * A rejected promise that records whether the code under test attached a rejection handler
 * (`.catch`, `.then(_, onRejected)`, or `await` inside try/catch). Return it from an *untracked*
 * stub (see `stubUntracked`): vi.fn() attaches its own handler to every promise it returns,
 * which would hide an unhandled rejection.
 */
export function rejectionProbe<T>(error: unknown) {
  let handled = false;
  class ProbePromise<V> extends Promise<V> {
    static get [Symbol.species]() {
      return Promise;
    }
    override then<R1 = V, R2 = never>(
      onFulfilled?: ((value: V) => R1 | PromiseLike<R1>) | null,
      onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> {
      if (typeof onRejected === 'function') handled = true;
      return super.then(onFulfilled, onRejected);
    }
  }
  const promise = new ProbePromise<T>((_, reject) => reject(error));
  // Keep the probe itself from tripping Node's unhandled-rejection handler; doesn't count as "handled".
  Promise.prototype.then.call(promise, undefined, () => {});
  return {
    promise: promise as Promise<T>,
    get handled() {
      return handled;
    },
  };
}

/** Swaps a method for a plain (non-vi.fn) function for the rest of the current test. */
export function stubUntracked<O extends object, K extends keyof O>(obj: O, key: K, impl: O[K]) {
  const original = obj[key];
  obj[key] = impl;
  onTestFinished(() => {
    obj[key] = original;
  });
}
