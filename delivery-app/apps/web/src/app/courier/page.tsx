import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Corridas" };

export default function CourierHomePage() {
  return (
    <PagePlaceholder
      title="Corridas disponíveis"
      todo={[
        "Botão online/offline (PATCH /api/v1/courier/status)",
        "Enviar posição a cada ~10 s com navigator.geolocation.watchPosition (POST /api/v1/courier/location)",
        "Lista de corridas próximas (bairro, distância, valor) + canal da região em tempo real",
        "Aceitar corrida (POST /api/v1/courier/deliveries/[id]/accept) e abrir /courier/delivery/[id]",
        "Wake Lock para a tela não apagar durante a corrida",
      ]}
    />
  );
}
