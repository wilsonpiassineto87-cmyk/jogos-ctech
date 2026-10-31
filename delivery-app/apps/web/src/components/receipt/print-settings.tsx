"use client";

import { Eye, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAPER_COOKIE, PAPERS, PRINT_ON_ACCEPT_COOKIE, type Paper, openReceipt, savePreference } from "@/lib/receipt-settings";

/**
 * Configurações de impressão (Configurações da loja). Salvas neste aparelho: o computador do
 * balcão pode usar a térmica de 80 mm e o celular do dono, uma impressora A4.
 */
export function PrintSettings({
  paper: initialPaper,
  printOnAccept: initialPrintOnAccept,
  sampleOrderId,
}: {
  paper: Paper;
  printOnAccept: boolean;
  sampleOrderId: string | null;
}) {
  const router = useRouter();
  const [paper, setPaper] = useState(initialPaper);
  const [printOnAccept, setPrintOnAccept] = useState(initialPrintOnAccept);
  const [saved, setSaved] = useState(false);

  const save = (nextPaper: Paper, nextPrintOnAccept: boolean) => {
    setPaper(nextPaper);
    setPrintOnAccept(nextPrintOnAccept);
    savePreference(PAPER_COOKIE, nextPaper);
    savePreference(PRINT_ON_ACCEPT_COOKIE, nextPrintOnAccept ? "1" : "0");
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-medium">Tamanho do papel</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PAPERS) as Paper[]).map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3",
                paper === value && "border-primary bg-accent/60 ring-1 ring-primary",
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="paper"
                  value={value}
                  checked={paper === value}
                  onChange={() => save(value, printOnAccept)}
                  className="accent-[var(--primary)]"
                />
                {PAPERS[value].label}
              </span>
              <span className="text-xs text-muted-foreground">{PAPERS[value].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">Quando imprimir</legend>
        <div className="grid gap-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
            <input
              type="radio"
              name="when"
              checked={!printOnAccept}
              onChange={() => save(paper, false)}
              className="mt-1 accent-[var(--primary)]"
            />
            <span>
              <span className="font-medium">Manual</span>
              <span className="block text-xs text-muted-foreground">Só quando tocar em &quot;IMPRIMIR PEDIDO&quot;.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
            <input
              type="radio"
              name="when"
              checked={printOnAccept}
              onChange={() => save(paper, true)}
              className="mt-1 accent-[var(--primary)]"
            />
            <span>
              <span className="font-medium">Ao aceitar o pedido</span>
              <span className="block text-xs text-muted-foreground">
                O botão vira &quot;Aceitar e imprimir&quot; e a impressão abre no mesmo toque.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        {sampleOrderId ? (
          <>
            <Button type="button" variant="outline" onClick={() => openReceipt(sampleOrderId, { auto: false })}>
              <Eye />
              Ver comprovante de exemplo
            </Button>
            <Button type="button" onClick={() => openReceipt(sampleOrderId)}>
              <Printer />
              Imprimir teste
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">O exemplo aparece quando a loja tiver o primeiro pedido.</p>
        )}
        {saved && <span className="text-sm text-muted-foreground">Salvo neste aparelho.</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Vale só para este aparelho: configure em cada computador ou celular que imprime. Pedidos antigos ficam em{" "}
        <strong>Histórico</strong>, para reimprimir ou tirar 2ª via.
      </p>
    </div>
  );
}
