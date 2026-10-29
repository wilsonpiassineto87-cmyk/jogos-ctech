"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recarrega os dados do servidor periodicamente (enquanto a aba está visível).
 * Substitui o tempo real enquanto o Pusher não está configurado.
 */
export function AutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
