/** Cart shapes as the server sends them (docnowtesting/server/src/routes/cart.ts). */

export interface CartPatient {
  id: string;
  name: string;
  relation: string;
}

export interface CartItem {
  id: string;
  testCode: string;
  testName: string;
  /** Rupees, fixed by the server when the item was added. */
  price: number;
  mrp?: number | null;
  patientId?: string | null;
  patient?: CartPatient | null;
  /** False once the catalog item is switched off; checkout has to refuse it. */
  isAvailable?: boolean;
  /** Today's catalog price, which may differ from `price`. */
  currentPrice?: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface AddToCartReply {
  message?: string;
  /** The server saw this idempotency key before, so nothing was added a second time. */
  duplicate?: boolean;
  item?: CartItem;
}
