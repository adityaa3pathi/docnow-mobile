/** What to show after "Book All Tests" on a prescription, kept apart from React so it can be tested. */
import type { CartAddResult, RecommendedTest } from './types';

/** The server's reason for a test that was skipped because the same person already has it in the cart. */
export const ALREADY_IN_CART = 'Already in cart';

export interface CartFunnel {
    headline: string;
    added: RecommendedTest[];
    alreadyInCart: RecommendedTest[];
    unavailable: { test: RecommendedTest; reason: string }[];
    /** Straight to slot selection when everything is new; via the cart when it held some already. */
    cta: { label: string; href: '/tests/checkout' | '/(tabs)/tests' } | null;
}

const plural = (n: number) => `${n} test${n === 1 ? '' : 's'}`;

export function cartFunnel(result: CartAddResult, tests: RecommendedTest[]): CartFunnel {
    const byCode = (code: string): RecommendedTest => tests.find((t) => t.code === code) ?? { code, name: code };
    const added = result.added.map(byCode);
    const alreadyInCart = result.skipped.filter((s) => s.reason === ALREADY_IN_CART).map((s) => byCode(s.code));
    const unavailable = result.skipped.filter((s) => s.reason !== ALREADY_IN_CART).map((s) => ({ test: byCode(s.code), reason: s.reason }));

    const headline = added.length
        ? `✓ Added ${plural(added.length)} to your cart`
        : alreadyInCart.length
          ? `✓ ${alreadyInCart.length === 1 ? 'This test is' : `All ${plural(alreadyInCart.length)} are`} already in your cart`
          : 'We could not add these tests';

    // The cart page shows what was already there, so the person can check it before choosing a slot.
    const cta = alreadyInCart.length
        ? { label: 'View in Cart & Checkout →', href: '/(tabs)/tests' as const }
        : added.length
          ? { label: 'Proceed to Select Slot & Address →', href: '/tests/checkout' as const }
          : null;

    return { headline, added, alreadyInCart, unavailable, cta };
}
