"use client";

import { BellOff, BellRing, Printer, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { openReceipt } from "@/lib/receipt-settings";

export type LatestOrder = { id: string; code: string; time: string };

const SOUND_KEY = "new-order-sound";

/**
 * Aviso de pedido novo. A lista é recarregada sozinha (AutoRefresh); quando chega um pedido
 * mais recente: aviso na tela com número e horário, som (Web Audio, sem arquivo), notificação
 * do celular/computador (se permitida) e a contagem no título da aba.
 */
export function NewOrderAlert({ pendingCount, latest }: { pendingCount: number; latest: LatestOrder | null }) {
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState<LatestOrder | null>(null);
  const lastSeen = useRef(latest?.id ?? null);
  const audio = useRef<AudioContext | null>(null);

  const beep = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    void ctx.resume();
    // Três toques curtos.
    [0, 0.25, 0.5].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
  }, []);

  // O som fica ligado entre visitas. O navegador só libera o áudio depois de um toque na
  // tela, então ele é preparado no primeiro toque em qualquer lugar.
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(SOUND_KEY) === "1";
    } catch {}
    if (!saved) return;
    setEnabled(true);
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Pedido mais recente mudou desde a última atualização: é pedido novo.
  useEffect(() => {
    if (!latest || latest.id === lastSeen.current) return;
    lastSeen.current = latest.id;
    setNotice(latest);
    if (enabled) beep();
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
      try {
        new Notification(`Novo pedido #${latest.code}`, { body: `Recebido às ${latest.time}`, icon: "/icons/icon-192.png", tag: latest.id });
      } catch {
        // Alguns celulares só mostram notificações pelo service worker: o aviso na tela basta.
      }
    }
  }, [latest, enabled, beep]);

  // "(2) Pedidos": dá para ver que tem pedido esperando mesmo com a aba em segundo plano.
  // O Next reescreve o título ao trocar de página: reaplica sempre que ele mudar.
  useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\)\s*/, "");
    const apply = () => {
      const next = pendingCount > 0 ? `(${pendingCount}) ${strip(document.title)}` : strip(document.title);
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = strip(document.title);
    };
  }, [pendingCount]);

  const toggle = () => {
    const next = !enabled;
    if (next) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      beep();
      if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    }
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {}
    setEnabled(next);
  };

  return (
    <>
      <Button variant={enabled ? "secondary" : "default"} size="sm" onClick={toggle}>
        {enabled ? <BellRing /> : <BellOff />}
        {enabled ? "Alertas ligados" : "Ligar alertas de novos pedidos"}
      </Button>
      {notice && (
        <div
          role="alert"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border-2 border-primary bg-card p-4 shadow-xl"
        >
          <BellRing className="size-6 shrink-0 animate-bounce text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Novo pedido #{notice.code}</p>
            <p className="text-sm text-muted-foreground">Recebido às {notice.time}</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              openReceipt(notice.id);
              setNotice(null);
            }}
          >
            <Printer />
            Imprimir
          </Button>
          <button onClick={() => setNotice(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Fechar aviso">
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
