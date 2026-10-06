// Locks shared across hook instances, so one booking never opens two checkouts or two resumes.
const held = new Set<string>();

export const acquire = (key: string) => (held.has(key) ? false : (held.add(key), true));
export const release = (key: string) => void held.delete(key);
export const anyHeld = (prefix: string) => [...held].some((k) => k.startsWith(prefix));

export const checkoutKey = (bookingId: string) => `checkout:${bookingId}`;
export const resumeKey = (bookingId: string) => `resume:${bookingId}`;
export const anyCheckoutOpen = () => anyHeld('checkout:');
