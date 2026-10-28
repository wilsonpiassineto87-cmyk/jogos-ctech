import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Relatórios" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Relatórios"
      todo={[
        "Vendas por período, ticket médio e comissões",
        "Exportar CSV",
      ]}
    />
  );
}
