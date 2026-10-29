const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 4990 -> "R$ 49,90" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** "12,50", "R$ 1.234,5" ou "12.5" -> centavos. Retorna null se não for um valor válido. */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, "");
  if (!cleaned) return null;
  // Com vírgula, ela é o separador decimal e os pontos são de milhar.
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** 1250 -> "12,50" (para preencher campos de formulário). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Aplica basis points (1200 = 12%) arredondando para o centavo mais próximo. */
export function applyBps(cents: number, bps: number): number {
  return Math.round((cents * bps) / 10_000);
}
