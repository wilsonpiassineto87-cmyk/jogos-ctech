// Configurações de impressão do comprovante. Ficam em cookies do APARELHO (não no banco):
// cada computador/celular da loja pode estar ligado a uma impressora diferente.

export const PAPERS = {
  "58": { label: "Térmica 58 mm", hint: "Maquininhas e impressoras pequenas" },
  "80": { label: "Térmica 80 mm", hint: "A mais comum em lanchonetes" },
  a4: { label: "Folha A4", hint: "Impressora comum de escritório" },
} as const;

export type Paper = keyof typeof PAPERS;

export const PAPER_COOKIE = "receipt_paper";
export const PRINT_ON_ACCEPT_COOKIE = "receipt_print_on_accept";
export const DEFAULT_PAPER: Paper = "80";

export function parsePaper(value: string | null | undefined): Paper | null {
  return value && value in PAPERS ? (value as Paper) : null;
}

/** Endereço da página de impressão. `auto` abre a janela de impressão sozinha; `copy` = 2ª via. */
export function receiptUrl(orderId: string, options: { auto?: boolean; copy?: boolean; paper?: Paper } = {}) {
  const params = new URLSearchParams();
  if (options.paper) params.set("papel", options.paper);
  if (options.copy) params.set("via", "2");
  if (options.auto) params.set("auto", "1");
  const query = params.toString();
  return `/print/order/${orderId}${query ? `?${query}` : ""}`;
}

/** Grava uma preferência neste aparelho por 1 ano (só no navegador). */
export function savePreference(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Abre o comprovante numa aba nova (o painel continua aberto atrás). Precisa ser chamado
 * dentro de um clique: fora dele o navegador bloqueia a aba; aí abre na mesma aba.
 */
export function openReceipt(orderId: string, options: { copy?: boolean; auto?: boolean } = {}) {
  const url = receiptUrl(orderId, { auto: options.auto ?? true, copy: options.copy });
  const tab = window.open(url, "_blank");
  if (!tab) window.location.assign(url);
}
