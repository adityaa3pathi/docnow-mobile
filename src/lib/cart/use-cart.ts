/** The shared cart state: one React Query cache entry every screen reads. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAppActive } from '@/hooks/use-app-active';
import { useAuth } from '@/lib/auth';

import { cartApi } from './api';
import { cartCount, withoutItem } from './state';
import type { Cart } from './types';

export const CART_KEY = ['cart'] as const;

/** The root layout clears the query cache on sign-out, so no cart survives an account change. */
export function useCart() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: CART_KEY,
    queryFn: cartApi.get,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const { refetch } = query;
  useAppActive(() => {
    if (user) void refetch();
  });

  return {
    cart: query.data ?? null,
    count: cartCount(query.data),
    loading: query.isLoading,
    /** The last read failed, so the cart is unknown, which is not the same as empty. */
    failed: query.isError,
    signedIn: Boolean(user),
    refresh: useCallback(() => void refetch(), [refetch]),
  };
}

/** Just the badge number, for headers and tab bars that need nothing else. */
export function useCartCount(): number {
  return useCart().count;
}

export interface AddToCartInput {
  testCode: string;
  /** One key per intended add. Pass the same key when retrying the same tap. */
  idempotencyKey: string;
  patientId?: string | null;
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddToCartInput) =>
      cartApi.add(input.testCode, { idempotencyKey: input.idempotencyKey, patientId: input.patientId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.remove(itemId),
    // The row leaves at once; a failed delete puts the cart back as it was.
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY });
      const previous = queryClient.getQueryData<Cart>(CART_KEY);
      queryClient.setQueryData<Cart | null>(CART_KEY, withoutItem(previous, itemId));
      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(CART_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}

/**
 * Runs `action` when signed in, otherwise sends the person to the login screen. The tabs sit
 * behind a sign-in guard already, so this catches a session that expired mid-screen.
 */
export function useRequireSignIn() {
  const { user } = useAuth();
  return useCallback(
    (action: () => void) => {
      if (!user) {
        router.push('/login');
        return;
      }
      action();
    },
    [user],
  );
}
