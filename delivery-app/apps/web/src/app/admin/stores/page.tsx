import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Lojas" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Lojas"
      todo={[
        "Lista filtrada por status",
        "Aprovar / suspender (gera AuditLog)",
        "Comissão específica por loja (commissionBps)",
      ]}
    />
  );
}
