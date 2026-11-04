"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recarrega os dados do servidor periodicamente, só enquanto a tela está visível.
 * Ao voltar para a tela (desbloqueou o celular, trocou de app) atualiza na hora, por
 * isso o intervalo pode ser mais longo sem a pessoa ver dados velhos.
 * Substitui o tempo real enquanto o Pusher não está configurado.
 */
export function AutoRefresh({ intervalMs = 20_000, background = false }: { intervalMs?: number; background?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    // Botão apertado (aceitar, sair...): espera a ação terminar. Uma atualização no meio
    // pode atropelar o redirecionamento e, no "Sair", até trazer a sessão de volta (o
    // middleware renova o cookie a cada visita às áreas logadas).
    let pausedUntil = 0;
    const onSubmit = () => {
      pausedUntil = Date.now() + 15_000;
    };
    document.addEventListener("submit", onSubmit, true);
    const refresh = () => {
      if (Date.now() < pausedUntil) return;
      last = Date.now();
      router.refresh();
    };
    // `background`: continua com a aba escondida (tela de pedidos da loja), senão o aviso de
    // pedido novo (som/notificação) só chegaria quando alguém olhasse a tela.
    const id = setInterval(() => {
      if (background || document.visibilityState === "visible") refresh();
    }, intervalMs);
    // Voltou para a tela depois de um tempo fora: atualiza sem esperar o próximo ciclo.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > intervalMs) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [router, intervalMs, background]);
  return null;
}
