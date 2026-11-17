import { useEffect, useState } from 'react';

/** Waits for typing to settle, so a search does not fire one request per keystroke. */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
