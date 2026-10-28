"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Estado do carrinho no navegador. Os preços aqui são só para exibição:
// o valor oficial vem de POST /api/v1/checkout/quote.

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  optionIds: string[];
  optionLabels: string[];
  notes?: string;
};

type CartState = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  /** Adicionar item de outra loja substitui o carrinho (confirme na UI antes). */
  add: (store: { id: string; name: string }, item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const itemKey = (i: Pick<CartItem, "productId" | "optionIds" | "notes">) =>
  [i.productId, [...i.optionIds].sort().join(","), i.notes ?? ""].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      storeId: null,
      storeName: null,
      items: [],
      add: (store, item) =>
        set((state) => {
          const key = itemKey(item);
          const items = state.storeId === store.id ? state.items : [];
          const existing = items.find((i) => i.key === key);
          return {
            storeId: store.id,
            storeName: store.name,
            items: existing
              ? items.map((i) => (i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i))
              : [...items, { ...item, key }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      remove: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      clear: () => set({ storeId: null, storeName: null, items: [] }),
    }),
    { name: "cart-v1" },
  ),
);

export const selectCartCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartSubtotal = (s: CartState) => s.items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);
