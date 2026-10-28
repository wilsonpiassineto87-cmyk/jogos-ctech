const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 4990 -> "R$ 49,90" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** Aplica basis points (1200 = 12%) arredondando para o centavo mais próximo. */
export function applyBps(cents: number, bps: number): number {
  return Math.round((cents * bps) / 10_000);
}
