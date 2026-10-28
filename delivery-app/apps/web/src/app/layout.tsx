import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "[Nome do Seu App]", template: "%s · [Nome do Seu App]" },
  description: "Delivery de restaurantes e mercados perto de você.",
};

export const viewport: Viewport = {
  themeColor: "#e8552a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
