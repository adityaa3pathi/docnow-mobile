import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** True while the app is in front. `onReturn` runs each time it comes back from the background. */
export function useAppActive(onReturn?: () => void) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const callback = useRef(onReturn);
  useEffect(() => {
    callback.current = onReturn;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setActive((was) => {
        if (state === 'active' && !was) callback.current?.();
        return state === 'active';
      });
    });
    return () => sub.remove();
  }, []);

  return active;
}
