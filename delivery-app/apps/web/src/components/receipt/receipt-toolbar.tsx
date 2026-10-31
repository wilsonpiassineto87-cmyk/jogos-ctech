"use client";

import { ArrowLeft, Copy, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PAPERS, type Paper, receiptUrl } from "@/lib/receipt-settings";

/**
 * Barra de cima da página de impressão (não sai no papel): tamanho do papel, imprimir,
 * 2ª via e voltar. Com `autoPrint`, abre a janela de impressão assim que a página carrega.
 */
export function ReceiptToolbar({
  orderId,
  code,
  paper,
  copy,
  autoPrint,
}: {
  orderId: string;
  code: string;
  paper: Paper;
  copy: boolean;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const printed = useRef(false);

  useEffect(() => {
    if (!autoPrint || printed.current) return;
    printed.current = true;
    // Espera as fontes e o logo para o cupom não sair incompleto.
    const run = async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images, (img) => (img.complete ? null : img.decode().catch(() => null))),
      );
      window.print();
      // Tira o "auto" do endereço: recarregar a página não imprime de novo.
      router.replace(receiptUrl(orderId, { copy, paper }), { scroll: false });
    };
    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [autoPrint, orderId, copy, paper, router]);

  const goBack = () => {
    // Aberta pelo painel numa aba nova: fecha a aba. Aberta direto: volta para os pedidos.
    if (window.opener) window.close();
    else if (window.history.length > 1) router.back();
    else router.push("/restaurant");
  };

  return (
    <div className="print-toolbar sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft />
          Voltar
        </Button>
        <p className="mr-auto font-semibold">Pedido #{code}</p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Papel</span>
          <select
            value={paper}
            onChange={(e) => router.replace(receiptUrl(orderId, { copy, paper: e.target.value as Paper }), { scroll: false })}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {Object.entries(PAPERS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant={copy ? "secondary" : "outline"}
          size="sm"
          onClick={() => router.replace(receiptUrl(orderId, { copy: !copy, paper }), { scroll: false })}
        >
          <Copy />
          {copy ? "É 2ª via" : "Marcar 2ª via"}
        </Button>
        <Button size="sm" onClick={() => window.print()} className="font-bold">
          <Printer />
          IMPRIMIR
        </Button>
      </div>
      <p className="mx-auto max-w-3xl px-4 pb-2 text-xs text-muted-foreground">
        Na janela de impressão, escolha a impressora e deixe a escala em 100% (ou &quot;Padrão&quot;). Em térmicas, desligue
        &quot;Cabeçalhos e rodapés&quot;.
      </p>
    </div>
  );
}
