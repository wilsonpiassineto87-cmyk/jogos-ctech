"use client";

import { Download, EllipsisVertical, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "@/components/shared/link";
import { Button } from "@/components/ui/button";
import { APK_URL } from "@/lib/android-app";
import { type InstallPromptEvent, IosInstallSteps, isIOS, isStandalone } from "./install-banner";

type Mode = "loading" | "installed" | "ios" | "prompt" | "manual";

/**
 * Página /instalar (link para mandar no WhatsApp). Mostra o jeito certo para cada celular:
 * botão de instalar (Android/computador), passo a passo do Safari (iPhone) ou o APK.
 */
export function InstallPanel({ appName }: { appName: string }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (isStandalone()) return setMode("installed");
    if (isIOS()) return setMode("ios");
    // Sem o evento (navegador de dentro de outro app, já instalado...): instrução manual.
    setMode("manual");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    setMode(outcome === "accepted" ? "installed" : "manual");
  };

  if (mode === "loading") return <div className="h-40" />;

  if (mode === "installed") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">O app já está instalado neste celular.</p>
        <Button asChild size="lg" className="w-full">
          <Link href="/">Abrir o cardápio</Link>
        </Button>
      </div>
    );
  }

  if (mode === "ios") {
    return (
      <div className="space-y-4">
        <IosInstallSteps appName={appName} />
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Abriu pelo WhatsApp? Toque nos três pontinhos ou em <strong>Abrir no Safari</strong> primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === "prompt" ? (
        <Button size="lg" className="w-full" onClick={install}>
          <Smartphone className="size-5" />
          Instalar o app
        </Button>
      ) : (
        <ol className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">1</span>
            <span>
              Abriu pelo WhatsApp? Toque nos três pontinhos <EllipsisVertical className="inline size-4 align-text-bottom" /> e
              em <strong>Abrir no Chrome</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">2</span>
            <span>
              No Chrome, toque nos três pontinhos <EllipsisVertical className="inline size-4 align-text-bottom" /> e em{" "}
              <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).
            </span>
          </li>
        </ol>
      )}

      <div className="rounded-xl border p-4">
        <p className="font-medium">Prefere o arquivo instalador?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Só para Android. Ao abrir, o celular pede para permitir a instalação: toque em <strong>Configurações</strong>,
          ative <strong>Permitir desta fonte</strong> e volte.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full">
          <a href={APK_URL} download>
            <Download className="size-4" />
            Baixar o instalador (APK)
          </a>
        </Button>
      </div>
    </div>
  );
}
