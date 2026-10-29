"use client";

import { BellRing, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Toca um alerta (Web Audio, sem arquivo de som) quando aumenta o número de pedidos novos. */
export function NewOrderAlert({ pendingCount }: { pendingCount: number }) {
  const [enabled, setEnabled] = useState(false);
  const previous = useRef(pendingCount);
  const audio = useRef<AudioContext | null>(null);

  const beep = () => {
    const ctx = audio.current;
    if (!ctx) return;
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
  };

  useEffect(() => {
    if (enabled && pendingCount > previous.current) beep();
    previous.current = pendingCount;
  }, [pendingCount, enabled]);

  // Navegadores só liberam áudio depois de um clique do usuário.
  const toggle = () => {
    if (!enabled) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      beep();
    }
    setEnabled((e) => !e);
  };

  return (
    <Button variant={enabled ? "secondary" : "default"} size="sm" onClick={toggle}>
      {enabled ? <BellRing /> : <BellOff />}
      {enabled ? "Som ligado" : "Ligar som de novos pedidos"}
    </Button>
  );
}
