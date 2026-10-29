import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether the person ticked the NMC consent for a consultation, shared by the waiting room and the
 * join panel so a remount or a dropped call does not ask again while the app is open. The server
 * keeps the lasting record; after an app restart the box is shown unticked again.
 */
const given = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useTelemedicineConsent(key: string) {
  const consented = useSyncExternalStore(subscribe, () => given.has(key));
  const setConsented = useCallback(
    (on: boolean) => {
      if (on) given.add(key);
      else given.delete(key);
      emit();
    },
    [key],
  );
  return [consented, setConsented] as const;
}

/** Test helper. */
export function resetTelemedicineConsentForTests() {
  given.clear();
  emit();
}
