import type { MetadataRoute } from "next";

// PWA do entregador: "Adicionar à tela inicial" abre direto no portal /courier.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Entregas · Sorveteria do Bairro",
    short_name: "Entregas",
    start_url: "/courier",
    scope: "/courier",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF9F0",
    theme_color: "#E0457B",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
