import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Entregadores" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Entregadores"
      todo={[
        "Aprovar cadastro e documentos",
        "Suspender / bloquear",
      ]}
    />
  );
}
