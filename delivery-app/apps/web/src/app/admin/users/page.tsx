import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Usuários" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Usuários"
      todo={[
        "Busca por nome, e-mail ou telefone",
        "Suspender conta e alterar roles",
      ]}
    />
  );
}
