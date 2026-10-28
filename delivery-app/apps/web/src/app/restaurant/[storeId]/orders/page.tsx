import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Pedidos" };

export default function StoreOrdersPage() {
  return (
    <PagePlaceholder
      title="Painel de pedidos"
      todo={[
        "Kanban: Novos → Em preparo → Prontos → Em entrega",
        "Assinar private-store-{storeId}; tocar /sounds/new-order.mp3 em order.new (exige um clique inicial por política de autoplay)",
        "Aceitar (POST .../orders/[id]/accept) ou recusar com motivo",
        "Avançar para PREPARING / READY_FOR_PICKUP",
        "Botão abrir/pausar loja",
      ]}
    />
  );
}
