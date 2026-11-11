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
    <div className="fixed inset-x-0 bottom-0 z-20 px-4 pt-4 pb-[max(var(--badge-space),env(safe-area-inset-bottom))]">
      <Link
        href="/checkout"
        className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-primary py-3 pr-5 pl-3 font-semibold text-primary-foreground shadow-xl ring-1 ring-black/5 transition-colors hover:bg-primary/92"
      >
        <span className="flex items-center gap-3">
          <span className="relative grid size-10 place-items-center rounded-xl bg-primary-foreground/12">
            <ShoppingBag className="size-5" />
            <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-cone px-1 text-xs font-bold text-cone-foreground tabular-nums">
              {count}
            </span>
          </span>
          Ver carrinho
        </span>
        <span className="tabular-nums">{formatCents(subtotal)}</span>
      </Link>
    </div>
  );
}
