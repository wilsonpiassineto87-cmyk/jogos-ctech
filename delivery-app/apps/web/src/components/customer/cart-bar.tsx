"use client";

import { formatCents } from "@delivery/core";
import { ShoppingBag } from "lucide-react";
import Link from "@/components/shared/link";
import { useEffect, useState } from "react";
import { selectCartCount, selectCartSubtotal, useCart } from "@/stores/cart-store";

/** Barra fixa no rodapé com o resumo do carrinho (some quando está vazio). */
export function CartBar() {
  const count = useCart(selectCartCount);
  const subtotal = useCart(selectCartSubtotal);
  // O carrinho vem do localStorage: só aparece depois de montar, para não divergir do HTML do servidor.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 p-4 sm:pb-6">
      <Link
        href="/checkout"
        className="mx-auto flex max-w-3xl items-center justify-between rounded-xl bg-primary px-5 py-4 font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-5" />
          Ver carrinho · {count} {count === 1 ? "item" : "itens"}
        </span>
        <span className="tabular-nums">{formatCents(subtotal)}</span>
      </Link>
    </div>
  );
}
