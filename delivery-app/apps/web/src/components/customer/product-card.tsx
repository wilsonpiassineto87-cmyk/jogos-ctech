"use client";

import { formatCents } from "@delivery/core";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import type { MenuProduct } from "@/features/stores/queries";
import { useCart } from "@/stores/cart-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type StoreRef = { id: string; name: string };

export function ProductCard({ product, store, storeOpen }: { product: MenuProduct; store: StoreRef; storeOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const disabled = !product.isAvailable || !storeOpen;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors enabled:hover:bg-accent/60 disabled:opacity-60"
      >
        <div className="min-w-0">
          <p className="font-medium">{product.name}</p>
          {product.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          )}
          <p className="mt-2 font-semibold text-primary">
            {product.optionGroups.length > 0 && <span className="text-xs font-normal text-muted-foreground">a partir de </span>}
            {formatCents(product.priceCents)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="size-20 rounded-lg object-cover" />
          )}
          {!product.isAvailable && <Badge variant="secondary">Esgotado</Badge>}
        </div>
      </button>
      {open && <ProductDialog product={product} store={store} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProductDialog({ product, store, onClose }: { product: MenuProduct; store: StoreRef; onClose: () => void }) {
  const cart = useCart();
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const toggle = (groupId: string, optionId: string, maxSelect: number) =>
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      // Escolha única: troca a opção; múltipla: respeita o máximo.
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });

  const chosen = product.optionGroups.flatMap((g) => g.options.filter((o) => selected[g.id]?.includes(o.id)));
  const missing = product.optionGroups.find((g) => (selected[g.id]?.length ?? 0) < g.minSelect);
  const unitPrice = product.priceCents + chosen.reduce((sum, o) => sum + o.priceCents, 0);

  const add = () => {
    if (missing) return;
    if (cart.storeId && cart.storeId !== store.id && cart.items.length > 0) cart.clear();
    cart.add(store, {
      productId: product.id,
      name: product.name,
      unitPriceCents: unitPrice,
      quantity,
      optionIds: chosen.map((o) => o.id),
      optionLabels: chosen.map((o) => o.name),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border">
            <button className="p-2.5" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir">
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-medium tabular-nums">{quantity}</span>
            <button className="p-2.5" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Aumentar">
              <Plus className="size-4" />
            </button>
          </div>
          <Button size="lg" className="flex-1" disabled={!!missing} onClick={add}>
            {missing ? `Escolha: ${missing.name}` : `Adicionar ${formatCents(unitPrice * quantity)}`}
          </Button>
        </div>
      }
    >
      {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

      {product.optionGroups.map((group) => (
        <fieldset key={group.id} className="mt-5">
          <legend className="flex w-full items-center justify-between rounded-md bg-muted px-3 py-2 text-sm font-medium">
            {group.name}
            <span className="text-xs font-normal text-muted-foreground">
              {group.minSelect > 0 ? "Obrigatório · " : ""}
              {group.maxSelect === 1 ? "escolha 1" : `até ${group.maxSelect}`}
            </span>
          </legend>
          <div className="mt-1 divide-y">
            {group.options.map((option) => {
              const checked = selected[group.id]?.includes(option.id) ?? false;
              return (
                <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 py-3 text-sm">
                  <span>{option.name}</span>
                  <span className="flex items-center gap-3">
                    {option.priceCents > 0 && <span className="text-muted-foreground">+ {formatCents(option.priceCents)}</span>}
                    <input
                      type={group.maxSelect === 1 ? "radio" : "checkbox"}
                      name={group.id}
                      checked={checked}
                      onChange={() => toggle(group.id, option.id, group.maxSelect)}
                      className="size-4 accent-[var(--primary)]"
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <label className="mt-5 grid gap-1.5 text-sm font-medium">
        Alguma observação?
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={140}
          rows={2}
          placeholder="Ex.: sem cebola"
          className="rounded-md border bg-background px-3 py-2 font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>
    </Modal>
  );
}
