import type { MetadataRoute } from "next";

// PWA do entregador: "Adicionar à tela inicial" abre direto no portal /courier.
// TODO: adicionar ícones 192x192 e 512x512 em public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "[Nome do Seu App] Entregador",
    short_name: "Entregador",
    start_url: "/courier",
    scope: "/courier",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#e8552a",
    icons: [],
  };
}
