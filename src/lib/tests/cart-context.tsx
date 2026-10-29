import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { cartApi } from './api';
import type { Cart, CartItem } from './types';

interface CartContextValue {
  cart: Cart | null;
  items: CartItem[];
  cartCount: number;
  loading: boolean;
  mutating: boolean;
  refreshCart: () => Promise<Cart | null>;
  addToCart: (testCode: string, patientId?: string) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  assignPatient: (itemId: string, patientId: string | null) => Promise<boolean>;
  clearCart: () => Promise<void>;
  getItemCount: (testCode: string) => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(0);

  const issued = useRef(0);
  const applied = useRef(0);

  const apply = useCallback((requestId: number, next: Cart | null) => {
    if (requestId < applied.current) return; // a newer response already landed
    applied.current = requestId;
    setCart(next);
  }, []);

  const userId = user?.id ?? null;

  const fetchCart = useCallback(async (): Promise<Cart | null> => {
    if (!userId) {
      setCart(null);
      return null;
    }
    const id = ++issued.current;
    try {
      setLoading(true);
      const data = await cartApi.get();
      apply(id, data);
      return data;
    } catch {
      apply(id, null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apply, userId]);

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => setCart(null));
      return;
    }

    let cancelled = false;
    const id = ++issued.current;
    cartApi
      .get()
      .then((data) => {
        if (!cancelled) apply(id, data);
      })
      .catch(() => {
        if (!cancelled) setCart(null);
      });

    return () => {
      cancelled = true;
    };
  }, [apply, userId]);

  const addToCart = useCallback(
    async (testCode: string, patientId?: string): Promise<boolean> => {
      const id = ++issued.current;
      setPending((n) => n + 1);
      try {
        const updated = await cartApi.addItem(testCode, patientId);
        apply(id, updated);
        return true;
      } catch {
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [apply],
  );

  const removeFromCart = useCallback(
    async (itemId: string): Promise<boolean> => {
      const id = ++issued.current;
      setPending((n) => n + 1);
      try {
        const updated = await cartApi.removeItem(itemId);
        apply(id, updated);
        return true;
      } catch {
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [apply],
  );

  const assignPatient = useCallback(
    async (itemId: string, patientId: string | null): Promise<boolean> => {
      const id = ++issued.current;
      setPending((n) => n + 1);
      try {
        const updated = await cartApi.assignPatient(itemId, patientId);
        apply(id, updated);
        return true;
      } catch {
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [apply],
  );

  const clearCart = useCallback(async (): Promise<void> => {
    const id = ++issued.current;
    setPending((n) => n + 1);
    try {
      await cartApi.clear();
      apply(id, null);
    } catch {
      //
    } finally {
      setPending((n) => n - 1);
    }
  }, [apply]);

  const items = useMemo(() => cart?.items || [], [cart]);
  const cartCount = items.length;

  const getItemCount = useCallback(
    (testCode: string): number => {
      return items.filter((i) => i.testCode === testCode).length;
    },
    [items],
  );

  const value = useMemo(
    () => ({
      cart,
      items,
      cartCount,
      loading,
      mutating: pending > 0,
      refreshCart: fetchCart,
      addToCart,
      removeFromCart,
      assignPatient,
      clearCart,
      getItemCount,
    }),
    [
      cart,
      items,
      cartCount,
      loading,
      pending,
      fetchCart,
      addToCart,
      removeFromCart,
      assignPatient,
      clearCart,
      getItemCount,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
