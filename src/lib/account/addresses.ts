/**
 * Which saved address is the default one. The server has no isDefault column, so the choice is
 * kept on this phone and only decides the order and what checkout starts on.
 */
import type { SavedAddress } from '@/lib/checkout';

export const DEFAULT_BADGE = 'Default';
export const DEFAULT_NOTE = 'Checkout starts with your default address';

/** The stored choice when it still exists, otherwise the first saved address. */
export function resolveDefaultId(list: SavedAddress[], storedId?: string | null): string | null {
    if (storedId && list.some((row) => row.id === storedId)) return storedId;
    return list[0]?.id ?? null;
}

/** The default first, the rest in the order the server sent them. */
export function sortByDefault(list: SavedAddress[], defaultId?: string | null): SavedAddress[] {
    const chosen = resolveDefaultId(list, defaultId);
    if (!chosen) return [...list];
    return [...list].sort((a, b) => Number(b.id === chosen) - Number(a.id === chosen));
}
