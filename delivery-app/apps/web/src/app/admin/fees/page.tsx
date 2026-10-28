import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Taxas e comissões" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Taxas e comissões"
      todo={[
        "PlatformSettings: comissão padrão, taxa de serviço, valor da corrida",
        "Faixas de taxa de entrega (DeliveryFeeRule) por cidade e distância",
      ]}
    />
  );
}
