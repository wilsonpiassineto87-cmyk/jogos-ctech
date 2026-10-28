import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Avaliações" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Avaliações"
      todo={[
        "Listar avaliações dos clientes",
        "Responder avaliação",
      ]}
    />
  );
}
