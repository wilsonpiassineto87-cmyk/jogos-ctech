"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recarrega os dados do servidor periodicamente, só enquanto a tela está visível.
 * Ao voltar para a tela (desbloqueou o celular, trocou de app) atualiza na hora, por
 * isso o intervalo pode ser mais longo sem a pessoa ver dados velhos.
 * Substitui o tempo real enquanto o Pusher não está configurado.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);
    // Voltou para a tela depois de um tempo fora: atualiza sem esperar o próximo ciclo.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > intervalMs) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);
  return null;
}
