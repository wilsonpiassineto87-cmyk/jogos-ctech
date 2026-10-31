"use client";

import { Copy, Eye, Printer } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openReceipt, receiptUrl } from "@/lib/receipt-settings";

/** "IMPRIMIR PEDIDO" em destaque, com 2ª via e visualizar ao lado. */
export function PrintOrderButtons({ orderId, compact = false }: { orderId: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-wrap gap-2", !compact && "w-full")}>
      <Button
        type="button"
        size="sm"
        onClick={() => openReceipt(orderId)}
        className={cn("bg-foreground font-bold text-background hover:bg-foreground/85", !compact && "flex-1")}
      >
        <Printer />
        {compact ? "Reimprimir" : "IMPRIMIR PEDIDO"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => openReceipt(orderId, { copy: true })} title="Imprimir uma 2ª via">
        <Copy />
        2ª via
      </Button>
      <Button asChild size="sm" variant="outline" title="Ver o comprovante antes de imprimir">
        <a href={receiptUrl(orderId)} target="_blank" rel="noopener">
          <Eye />
          Ver
        </a>
      </Button>
    </div>
  );
}

/**
 * Botão "Aceitar" do formulário do pedido. Com "Imprimir ao aceitar" ligado em
 * Configurações, abre o comprovante no mesmo clique (fora do clique o navegador bloqueia).
 */
export function AcceptOrderButton({ orderId, printOnAccept }: { orderId: string; printOnAccept: boolean }) {
  return (
    <SubmitButton size="sm" onClick={printOnAccept ? () => openReceipt(orderId) : undefined}>
      {printOnAccept ? "Aceitar e imprimir" : "Aceitar"}
    </SubmitButton>
  );
}
