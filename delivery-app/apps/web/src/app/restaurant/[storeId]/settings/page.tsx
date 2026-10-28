import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Configurações" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Configurações"
      todo={[
        "Dados da loja, raio de entrega e pedido mínimo",
        "Horários de funcionamento",
        "Equipe (StoreMember)",
      ]}
    />
  );
}
