import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Corrida" };

export default async function CourierDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PagePlaceholder
      title="Corrida em andamento"
      description={`Entrega ${id}`}
      todo={[
        "Mapa com rota até o restaurante e depois até o cliente (Mapbox/Google)",
        "Botões: Cheguei na loja → Coletei → Confirmar entrega",
        "Confirmação com o PIN de 4 dígitos informado pelo cliente (POST .../complete)",
        "Endereço completo e contato do cliente visíveis só durante a corrida",
      ]}
    />
  );
}
