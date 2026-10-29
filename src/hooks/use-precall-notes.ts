import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { emptyNotes, notesKey, parseNotes, serializeNotes, toggleChecked, type ChecklistId, type PrecallNotes } from '@/lib/consult/waitingRoom';

/**
 * One copy of each consultation's pre-call notes, shared by every screen that shows them (the
 * waiting room and the in-call sheet are mounted at the same time), saved on this phone.
 */
const SAVE_DELAY_MS = 400;
const cache = new Map<string, PrecallNotes>();
const loading = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY = emptyNotes();

function emit(id: string) {
    listeners.get(id)?.forEach((l) => l());
}

function load(id: string) {
    if (cache.has(id) || loading.has(id)) return;
    loading.set(
        id,
        AsyncStorage.getItem(notesKey(id))
            .catch(() => null)
            .then((raw) => {
                // Typing before the read finished wins over what was stored.
                if (!cache.has(id)) cache.set(id, parseNotes(raw));
                emit(id);
            })
            .finally(() => loading.delete(id)),
    );
}

function write(id: string, next: PrecallNotes) {
    cache.set(id, next);
    emit(id);
    clearTimeout(timers.get(id));
    timers.set(
        id,
        setTimeout(() => {
            timers.delete(id);
            AsyncStorage.setItem(notesKey(id), serializeNotes(next)).catch(() => {});
        }, SAVE_DELAY_MS),
    );
}

export function usePrecallNotes(consultationId: string) {
    useEffect(() => load(consultationId), [consultationId]);

    const subscribe = useCallback(
        (cb: () => void) => {
            const set = listeners.get(consultationId) ?? new Set();
            set.add(cb);
            listeners.set(consultationId, set);
            return () => set.delete(cb);
        },
        [consultationId],
    );
    const notes = useSyncExternalStore(subscribe, () => cache.get(consultationId) ?? EMPTY);

    const toggle = useCallback((id: ChecklistId) => write(consultationId, toggleChecked(cache.get(consultationId) ?? EMPTY, id)), [consultationId]);
    const setQuestions = useCallback(
        (questions: string) => write(consultationId, { ...(cache.get(consultationId) ?? EMPTY), questions }),
        [consultationId],
    );

    return { notes, toggle, setQuestions };
}

/** Test helper: forgets everything in memory (storage is the test's own mock). */
export function resetPrecallNotesForTests() {
    cache.clear();
    loading.clear();
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
}
