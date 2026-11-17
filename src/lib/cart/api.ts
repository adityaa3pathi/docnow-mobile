/** One typed call per cart route. The server sets the price, so no amount is ever sent. */
import { api } from '@/lib/api';

import type { AddToCartReply, Cart } from './types';

export const cartApi = {
  get: () => api.get<Cart>('/api/cart').then((r) => r.data),

  /** The same `idempotencyKey` twice adds one line, so a retried tap cannot double up. */
  add: (testCode: string, opts: { idempotencyKey: string; patientId?: string | null }) =>
    api
      .post<AddToCartReply>(
        '/api/cart/items',
        { testCode, patientId: opts.patientId ?? null },
        { headers: { 'Idempotency-Key': opts.idempotencyKey } },
      )
      .then((r) => r.data),

  assignPatient: (itemId: string, patientId: string | null) =>
    api.put<{ item: Cart['items'][number] }>(`/api/cart/items/${itemId}`, { patientId }).then((r) => r.data.item),

  remove: (itemId: string) => api.delete(`/api/cart/items/${itemId}`).then(() => undefined),
};
