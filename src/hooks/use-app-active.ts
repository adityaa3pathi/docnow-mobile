import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** True while the app is in front. `onReturn` runs each time it comes back from the background. */
export function useAppActive(onReturn?: () => void) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const callback = useRef(onReturn);
  const wasActive = useRef(AppState.currentState === 'active');
  useEffect(() => {
    callback.current = onReturn;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const now = state === 'active';
      const returned = now && !wasActive.current;
      wasActive.current = now;
      setActive(now);
      if (returned) callback.current?.();
    });
    return () => sub.remove();
  }, []);

  return active;
}
