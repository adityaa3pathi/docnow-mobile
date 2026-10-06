// No SDK import here, so tests never load the native module.
export const FAILED_MESSAGE =
  'That attempt did not complete. You can try again while the hold lasts. If money was taken, it will show in My consultations.';

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export type CheckoutOutcome =
  | { kind: 'paid'; payment: PaymentResult }
  | { kind: 'dismissed' }
  | { kind: 'failed'; message: string }
  | { kind: 'could_not_open' };

export class SdkMissingError extends Error {
  constructor() {
    super('Razorpay checkout is not available in this build');
  }
}

/** The SDK reports 2 when the patient closes checkout. */
const CANCELLED_CODE = 2;

/** A cancel is only a dismissal. Every other error is non-committal, because the server decides the result. */
export function mapCheckoutError(error: unknown): CheckoutOutcome {
  if (error instanceof SdkMissingError) return { kind: 'could_not_open' };
  const code = (error as { code?: unknown } | null)?.code;
  if (code === CANCELLED_CODE) return { kind: 'dismissed' };
  // A thrown error with no code means checkout never opened.
  if (error instanceof Error && code === undefined) return { kind: 'could_not_open' };
  return { kind: 'failed', message: FAILED_MESSAGE };
}

/** Accepts a success result only when all three fields are there. */
export function mapCheckoutSuccess(data: unknown): CheckoutOutcome {
  const d = data as Partial<PaymentResult> | null;
  if (d?.razorpay_payment_id && d.razorpay_order_id && d.razorpay_signature) {
    return {
      kind: 'paid',
      payment: {
        razorpay_payment_id: d.razorpay_payment_id,
        razorpay_order_id: d.razorpay_order_id,
        razorpay_signature: d.razorpay_signature,
      },
    };
  }
  return { kind: 'failed', message: FAILED_MESSAGE };
}
