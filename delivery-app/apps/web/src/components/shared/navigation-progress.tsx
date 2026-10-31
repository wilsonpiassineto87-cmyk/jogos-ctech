"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Barrinha no topo da tela enquanto a próxima página carrega. Sem ela, ao tocar num
 * link a tela fica parada até a resposta chegar e parece travada (os links não
 * pré-carregam, para economizar processamento no Cloudflare).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Chegou na página nova: esconde a barra.
  useEffect(() => setLoading(false), [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      // Mesma página (ou só uma âncora #): não há o que carregar.
      if (url.pathname === location.pathname && url.search === location.search) return;
      setLoading(true);
    };
    // Fase de captura: roda antes do next/link, que cancela o clique (preventDefault) para
    // navegar sem recarregar a página.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Se algo der errado (sem internet), não deixa a barra presa para sempre.
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 15_000);
    return () => clearTimeout(id);
  }, [loading]);

  if (!loading) return null;
  return (
    <div role="progressbar" aria-label="Carregando" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
