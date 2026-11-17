/**
 * ============================================================================
 * Cart module — the only place the app reads or changes the lab-test cart.
 * ============================================================================
 *
 * State lives in one React Query entry under `CART_KEY`, so every screen sees
 * the same cart and the root layout's `queryClient.clear()` on sign-out wipes it.
 *
 * Reading
 *   const { cart, count, loading, failed, signedIn, refresh } = useCart();
 *   const count = useCartCount();                       // badges only
 *   countForCode(cart, 'package_94')                    // 0 when not in the cart
 *
 * Adding (one idempotency key per intended add; reuse it when retrying a tap)
 *   const add = useAddToCart();
 *   const requireSignIn = useRequireSignIn();
 *   requireSignIn(() => add.mutate({ testCode, idempotencyKey: newIdempotencyKey() }));
 *
 * Removing (optimistic; rolls back if the server refuses)
 *   const remove = useRemoveCartItem();
 *   remove.mutate(item.id);
 *
 * Assigning a person to a line
 *   cartApi.assignPatient(item.id, patientId)           // then invalidate CART_KEY
 *
 * Prices come from the server on every read. Nothing here adds up or discounts
 * money; checkout will ask the server for the amount to charge.
 */

export { cartApi } from './api';
export { newIdempotencyKey } from './keys';
export {
  addButtonView,
  addReducer,
  badgeLabel,
  cartCount,
  cartItems,
  countForCode,
  inCartLabel,
  initialAddState,
  personLabel,
  withoutItem,
} from './state';
export type { AddAction, AddButtonView, AddPhase, AddState } from './state';
export type { AddToCartReply, Cart, CartItem, CartPatient } from './types';
export { CART_KEY, useAddToCart, useCart, useCartCount, useRemoveCartItem, useRequireSignIn } from './use-cart';
export type { AddToCartInput } from './use-cart';
