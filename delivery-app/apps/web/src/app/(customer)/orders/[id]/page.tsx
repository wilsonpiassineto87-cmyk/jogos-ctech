import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Acompanhar pedido" };

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PagePlaceholder
      title="Acompanhar pedido"
      description={`Pedido ${id}`}
      todo={[
        "Linha do tempo a partir de OrderStatusHistory",
        "Assinar o canal private-order-{id} (status e posição do entregador)",
        "Mapa com loja, entregador e destino",
        "Exibir o PIN de entrega para o cliente informar ao entregador",
        "QR code do Pix enquanto o pedido estiver em PENDING_PAYMENT",
      ]}
    />
  );
}
