import * as Crypto from 'expo-crypto';

/** The only cart file that touches native code, so the tested files stay free of it. */
export function newIdempotencyKey(): string {
  return `cart_${Crypto.randomUUID()}`;
}
