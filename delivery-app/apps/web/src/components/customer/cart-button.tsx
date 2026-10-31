"use client";

import { ShoppingBag } from "lucide-react";
import Link from "@/components/shared/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { selectCartCount, useCart } from "@/stores/cart-store";

export function CartButton() {
  const count = useCart(selectCartCount);
  // O carrinho vem do localStorage: só mostra o número depois de montar, para não divergir do HTML do servidor.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/checkout" aria-label="Carrinho">
        <ShoppingBag />
        {mounted && count > 0 ? count : null}
      </Link>
    </Button>
  );
}
