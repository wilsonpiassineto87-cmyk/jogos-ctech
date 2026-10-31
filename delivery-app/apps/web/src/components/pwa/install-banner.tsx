"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

// Evento do Chrome/Edge/Samsung Internet que permite abrir a janela de instalação.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "install-banner-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  // iPadOS se apresenta como Mac, mas tem tela de toque.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Convite para instalar o app. No Android/computador usa a janela nativa de instalação;
 * no iPhone (onde não existe essa janela) mostra o passo a passo do Safari.
 */
export function InstallBanner({ appName }: { appName: string }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (isStandalone() || recentlyDismissed()) return;

    if (isIOS()) {
      setIos(true);
      setVisible(true);
      return;
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sem armazenamento (aba anônima): só esconde agora.
    }
    setVisible(false);
  };

  const install = async () => {
    if (ios) return setShowIosHelp(true);
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <>
      <div className="mx-auto mt-4 flex max-w-3xl items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <LogoMark className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold leading-tight">Instale o app da {appName}</p>
          <p className="text-sm text-muted-foreground">Peça direto da tela inicial do celular, sem digitar endereço.</p>
        </div>
        <Button size="sm" onClick={install}>
          Instalar
        </Button>
        <button onClick={dismiss} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Agora não">
          <X className="size-4" />
        </button>
      </div>

      <Modal open={showIosHelp} onClose={() => setShowIosHelp(false)} title="Instalar no iPhone">
        <ol className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">1</span>
            <span>
              Abra este site no <strong>Safari</strong> e toque em <strong>Compartilhar</strong>{" "}
              <Share className="inline size-4 align-text-bottom" /> (na barra de baixo).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">2</span>
            <span>
              Role e toque em <strong>Adicionar à Tela de Início</strong>{" "}
              <SquarePlus className="inline size-4 align-text-bottom" />.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">3</span>
            <span>
              Toque em <strong>Adicionar</strong>. O ícone da {appName} aparece junto com os seus apps.
            </span>
          </li>
        </ol>
      </Modal>
    </>
  );
}
