import { Colors } from '@/constants/theme';

import { mapCheckoutError, mapCheckoutSuccess, SdkMissingError, type CheckoutOutcome } from './razorpay-errors';

export type { CheckoutOutcome, PaymentResult } from './razorpay-errors';

export interface CheckoutOptions {
  keyId: string;
  orderId: string;
  amountPaise: number;
  description: string;
  prefill?: { name?: string; contact?: string; email?: string };
}

type Sdk = { open(options: Record<string, unknown>): Promise<unknown> };

// Loaded on demand so Expo Go can still run every screen that is not payment.
async function loadSdk(): Promise<Sdk> {
  try {
    const mod = (await import('react-native-razorpay')) as unknown as { default?: Sdk } & Partial<Sdk>;
    const sdk = mod.default ?? (mod as Sdk);
    if (typeof sdk?.open === 'function') return sdk;
  } catch {
    // Falls through to the missing-SDK error below.
  }
  throw new SdkMissingError();
}

/** Opens native checkout and returns one outcome. It never decides whether the booking is paid. */
export async function openCheckout(opts: CheckoutOptions): Promise<CheckoutOutcome> {
  try {
    const sdk = await loadSdk();
    const data = await sdk.open({
      key: opts.keyId,
      amount: opts.amountPaise,
      currency: 'INR',
      order_id: opts.orderId,
      name: 'DOCNOW',
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: Colors.primary },
    });
    return mapCheckoutSuccess(data);
  } catch (e) {
    return mapCheckoutError(e);
  }
}
