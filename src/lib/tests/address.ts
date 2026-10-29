/** Which saved address checkout starts with. Kept apart from React so it can be tested. */
import type { Address } from './types';

/**
 * The suggested address (e.g. the patient's last collection address, from "Book All Tests")
 * when it is still saved, else the first saved one, else none, and checkout asks for one.
 */
export function pickInitialAddress(addresses: Address[], preferredId: string | null): Address | null {
  const active = addresses.filter((a) => !a.isDeleted);
  return (preferredId ? active.find((a) => a.id === preferredId) : undefined) ?? active[0] ?? null;
}
