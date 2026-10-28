import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Pedidos" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Pedidos"
      todo={[
        "Todos os pedidos com filtros",
        "Cancelar ou estornar (gera AuditLog)",
      ]}
    />
  );
}
