import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/shared/navigation-progress";
import "./globals.css";

// Fontes da marca: Fredoka (títulos, arredondada e alegre) e Nunito (textos).
const heading = Fredoka({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  // A área do cliente troca pelo nome da loja (app/(customer)/layout.tsx).
  title: { default: "Delivery", template: "%s · Delivery" },
  description: "Peça online e receba em casa.",
  // iPhone: "Adicionar à Tela de Início" usa este ícone e abre em tela cheia.
  appleWebApp: { capable: true, title: "Sorveteria", statusBarStyle: "default" },
  // Ícone da aba: o logo da sorveteria. Sem isso o navegador pede /favicon.ico e a Netlify
  // devolve o dela; o public/favicon.ico (gerado do logo) cobre esse pedido também.
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  // Arquivo fixo em public/ (servido sem processamento no Worker; antes era app/manifest.ts).
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  // A cor da barra do navegador/app (theme-color) vem das cores da loja: components/brand/store-theme.tsx.
  width: "device-width",
  initialScale: 1,
  // Ocupa a tela toda no iPhone; as barras fixas de baixo usam env(safe-area-inset-bottom).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh font-sans">
        <Suspense>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
