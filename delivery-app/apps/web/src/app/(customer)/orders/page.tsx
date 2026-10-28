import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Meus pedidos" };

export default function OrdersPage() {
  return (
    <PagePlaceholder
      title="Meus pedidos"
      todo={["Lista paginada via GET /api/v1/orders", "Repetir pedido", "Avaliar pedidos entregues"]}
    />
  );
}
