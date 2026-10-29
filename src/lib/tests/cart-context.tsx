import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  const [mutating, setMutating] = useState(false);

  const fetchCart = useCallback(async (): Promise<Cart | null> => {
    if (!user) {
      setCart(null);
      return null;
    }
    try {
      setLoading(true);
      const data = await cartApi.get();
      setCart(data);
      return data;
    } catch {
      setCart(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!user) {
          if (!cancelled) setCart(null);
          return null;
        }
        return cartApi.get().then((data) => {
          if (!cancelled) setCart(data);
        });
      })
      .catch(() => {
        if (!cancelled) setCart(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const addToCart = useCallback(
    async (testCode: string, patientId?: string): Promise<boolean> => {
      try {
        setMutating(true);
        const updated = await cartApi.addItem(testCode, patientId);
        setCart(updated);
        return true;
      } catch {
        return false;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  const removeFromCart = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      setMutating(true);
      const updated = await cartApi.removeItem(itemId);
      setCart(updated);
      return true;
    } catch {
      return false;
    } finally {
      setMutating(false);
    }
  }, []);

  const assignPatient = useCallback(
    async (itemId: string, patientId: string | null): Promise<boolean> => {
      try {
        setMutating(true);
        const updated = await cartApi.assignPatient(itemId, patientId);
        setCart(updated);
        return true;
      } catch {
        return false;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setMutating(true);
      await cartApi.clear();
      setCart(null);
    } catch {
      //
    } finally {
      setMutating(false);
    }
  }, []);

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
      mutating,
      refreshCart: fetchCart,
      addToCart,
      removeFromCart,
      assignPatient,
      clearCart,
      getItemCount,
    }),
    [cart, items, cartCount, loading, mutating, fetchCart, addToCart, removeFromCart, assignPatient, clearCart, getItemCount],
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
