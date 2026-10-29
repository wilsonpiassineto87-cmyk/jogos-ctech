import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // A área do cliente troca pelo nome da loja (app/(customer)/layout.tsx).
  title: { default: "Delivery", template: "%s · Delivery" },
  description: "Peça online e receba em casa.",
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
